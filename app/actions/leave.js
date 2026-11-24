"use server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { q1, tx } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { workingDays } from "@/lib/leave";

const err = (to, m) => redirect(`${to}?err=${encodeURIComponent(m)}`);

export async function submitLeave(fd) {
  const u = await requireUser(["employee", "leader"]);
  const B = "/leaves/new";
  const half = fd.get("half") === "on";
  const start = String(fd.get("start_date") || "");
  const end = half ? start : String(fd.get("end_date") || "");
  const reason = String(fd.get("reason") || "").trim();
  const subId = +fd.get("substitute_id") || null;
  const t = await q1("SELECT * FROM leave_types WHERE id=$1 AND is_active", [+fd.get("leave_type_id")]);

  if (!t) err(B, "Pilih jenis cuti yang aktif.");
  if (!start || !end || end < start) err(B, "Tanggal mulai dan selesai tidak valid.");
  if (!reason) err(B, "Alasan cuti wajib diisi.");
  if (!subId || subId === u.id) err(B, "Pilih rekan pengganti selain diri sendiri.");

  const sub = await q1("SELECT 1 FROM users WHERE id=$1 AND is_active AND division_id IS NOT DISTINCT FROM $2", [subId, u.division_id]);
  if (!sub) err(B, "Rekan pengganti harus berasal dari divisi yang sama.");

  const days = half ? 0.5 : await workingDays(start, end);
  if (days <= 0) err(B, "Periode tidak memuat hari kerja (Sabtu, Minggu, dan libur dikecualikan).");

  const { d: diff } = await q1("SELECT ($1::date - CURRENT_DATE) AS d", [start]);
  if (diff < t.min_notice_days) err(B, `${t.name} minimal diajukan H-${t.min_notice_days}.`);
  if (diff < -t.max_late_days) err(B, `${t.name} maksimal diajukan ${t.max_late_days} hari setelah tanggal mulai.`);

  if (await q1(`SELECT 1 FROM leave_requests WHERE user_id=$1 AND status IN ('pending','approved_leader','approved')
                AND start_date <= $3 AND end_date >= $2`, [u.id, start, end]))
    err(B, "Bertabrakan dengan pengajuan cuti lain yang masih aktif.");
  const bo = await q1("SELECT note FROM blackout_periods WHERE start_date <= $2 AND end_date >= $1 LIMIT 1", [start, end]);
  if (bo) err(B, `Tanggal masuk periode blackout${bo.note ? ": " + bo.note : ""}.`);
  if (t.quota_days != null && days > t.quota_days) err(B, `Melebihi batas ${t.name} (${t.quota_days} hari).`);
  if (t.deducts_annual_quota && days > u.leave_quota) err(B, `Kuota tidak cukup. Sisa ${u.leave_quota} hari, diminta ${days} hari.`);

  let file = null;
  const f = fd.get("attachment");
  if (f && f.size) {
    const ext = path.extname(f.name).toLowerCase();
    if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) err(B, "Lampiran harus PDF, JPG, atau PNG.");
    if (f.size > 5 * 1024 * 1024) err(B, "Ukuran lampiran maksimal 5 MB.");
    file = crypto.randomUUID() + ext;
    await fs.mkdir("uploads", { recursive: true });
    await fs.writeFile(path.join("uploads", file), Buffer.from(await f.arrayBuffer()));
  }
  if (t.requires_attachment && !file) err(B, `${t.name} wajib melampirkan dokumen.`);

  const id = await tx(async (run) => {
    if (t.deducts_annual_quota) {
      const ok = await run("UPDATE users SET leave_quota = leave_quota - $1 WHERE id=$2 AND leave_quota >= $1 RETURNING id", [days, u.id]);
      if (!ok.length) throw new Error("quota");
    }
    const r = await run(
      `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, total_days, is_half_day, reason,
        substitute_id, handover_note, address, emergency_phone, attachment_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [u.id, t.id, start, end, days, half, reason, subId, fd.get("handover_note"), fd.get("address"), fd.get("emergency_phone"), file]);
    return r[0].id;
  }).catch(() => err(B, "Kuota tidak cukup."));
  redirect(`/leaves/${id}`);
}

export async function cancelLeave(fd) {
  const u = await requireUser(["employee", "leader"]);
  const id = +fd.get("id"), reason = String(fd.get("cancel_reason") || "").trim();
  const back = `/leaves/${id}`;
  if (!reason) err(back, "Alasan pembatalan wajib diisi.");
  await tx(async (run) => {
    const r = (await run(
      `UPDATE leave_requests SET status='cancelled', cancel_reason=$3 WHERE id=$1 AND user_id=$2 AND status='pending'
       RETURNING total_days, leave_type_id`, [id, u.id, reason]))[0];
    if (!r) return;
    await run(`UPDATE users SET leave_quota = leave_quota + $1 WHERE id=$2 AND
      (SELECT deducts_annual_quota FROM leave_types WHERE id=$3)`, [r.total_days, u.id, r.leave_type_id]);
  });
  redirect(back);
}
