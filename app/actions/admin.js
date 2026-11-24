"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { q, q1, tx } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const g = (fd, k) => String(fd.get(k) || "").trim();
const go = (to, m, k = "err") => redirect(`${to}${to.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(m)}`);
const dupMsg = (e) => (e.code === "23505" ? "Data sudah dipakai (nama, username, atau email harus unik)." : "Gagal menyimpan data.");

/* ---------- Pengguna ---------- */
export async function saveUser(fd) {
  await requireUser(["admin"]);
  const id = +fd.get("id") || null, B = id ? `/users?edit=${id}` : "/users";
  const v = Object.fromEntries(["full_name", "username", "email", "password", "role", "division_id", "leave_quota", "join_date"].map((k) => [k, g(fd, k)]));
  if (!v.full_name || !v.username || !v.email || !v.role || v.leave_quota === "" || (!id && !v.password)) go(B, "Semua field wajib diisi.");
  if (!/^\S+@\S+\.\S+$/.test(v.email)) go(B, "Format email tidak valid.");
  if (v.password && v.password.length < 8) go(B, "Password minimal 8 karakter.");
  if (!["admin", "employee", "leader", "hrd"].includes(v.role)) go(B, "Role tidak valid.");
  const div = +v.division_id || null, quota = parseFloat(v.leave_quota);
  if (!(quota >= 0 && quota <= 99)) go(B, "Kuota tidak valid.");
  try {
    if (id) {
      await q(`UPDATE users SET full_name=$1, username=$2, email=$3, role=$4, division_id=$5, leave_quota=$6, is_active=$7,
               join_date=COALESCE(NULLIF($8,'')::date, join_date) WHERE id=$9`,
        [v.full_name, v.username, v.email.toLowerCase(), v.role, div, quota, fd.get("is_active") === "1", v.join_date, id]);
      if (v.password) await q("UPDATE users SET password_hash=$1 WHERE id=$2", [await bcrypt.hash(v.password, 10), id]);
    } else {
      await q(`INSERT INTO users (full_name, username, email, password_hash, role, division_id, leave_quota, join_date)
               VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE(NULLIF($8,'')::date, CURRENT_DATE))`,
        [v.full_name, v.username, v.email.toLowerCase(), await bcrypt.hash(v.password, 10), v.role, div, quota, v.join_date]);
    }
  } catch (e) { go(B, dupMsg(e)); }
  go("/users", "Pengguna disimpan.", "ok");
}
export async function deleteUser(fd) {
  await requireUser(["admin"]);
  const id = +fd.get("id");
  const u = await q1("SELECT role FROM users WHERE id=$1", [id]);
  if (!u || !["employee", "leader"].includes(u.role)) go("/users", "Admin dan HRD tidak dapat dihapus.");
  try { await q("DELETE FROM users WHERE id=$1", [id]); }
  catch { go("/users", "Pengguna sudah punya riwayat pengajuan. Nonaktifkan lewat Edit, jangan dihapus."); }
  go("/users", "Pengguna dihapus.", "ok");
}

/* ---------- Divisi ---------- */
async function setLeader(run, divId, leaderId) {
  const old = (await run("SELECT leader_id FROM divisions WHERE id=$1", [divId]))[0]?.leader_id;
  if (old && old !== leaderId) await run("UPDATE users SET role='employee' WHERE id=$1 AND role='leader'", [old]);
  await run("UPDATE divisions SET leader_id=$1 WHERE id=$2", [leaderId, divId]);
  if (leaderId) await run("UPDATE users SET role='leader', division_id=$1 WHERE id=$2 AND role IN ('employee','leader')", [divId, leaderId]);
}
export async function saveDivision(fd) {
  await requireUser(["admin"]);
  const id = +fd.get("id") || null, B = id ? `/divisions?edit=${id}` : "/divisions";
  const name = g(fd, "name"), leader = +fd.get("leader_id") || null;
  if (!name) go(B, "Nama divisi wajib diisi.");
  try {
    await tx(async (run) => {
      let did = id;
      if (id) await run("UPDATE divisions SET name=$1, description=$2 WHERE id=$3", [name, g(fd, "description"), id]);
      else did = (await run("INSERT INTO divisions (name, description) VALUES ($1,$2) RETURNING id", [name, g(fd, "description")]))[0].id;
      await setLeader(run, did, leader);
    });
  } catch (e) { go(B, e.code === "23505" ? "Nama divisi harus unik dan satu orang hanya memimpin satu divisi." : "Gagal menyimpan divisi."); }
  go("/divisions", "Divisi disimpan.", "ok");
}
export async function deleteDivision(fd) {
  await requireUser(["admin"]);
  const id = +fd.get("id"), d = await q1("SELECT name, leader_id FROM divisions WHERE id=$1", [id]);
  if (!d) go("/divisions", "Divisi tidak ditemukan.");
  if (fd.get("agree") !== "on" || g(fd, "confirm") !== d.name) go(`/divisions?del=${id}`, "Centang persetujuan dan ketik nama divisi dengan benar.");
  await tx(async (run) => {
    if (d.leader_id) await run("UPDATE users SET role='employee' WHERE id=$1 AND role='leader'", [d.leader_id]);
    await run("DELETE FROM divisions WHERE id=$1", [id]); // users.division_id -> NULL
  });
  go("/divisions", "Divisi dihapus. Akun anggota tetap ada.", "ok");
}
export async function addMember(fd) {
  await requireUser(["admin"]);
  const div = +fd.get("division_id"), uid = +fd.get("user_id");
  if (uid) await q("UPDATE users SET division_id=$1 WHERE id=$2 AND role='employee'", [div, uid]);
  redirect(`/divisions?sel=${div}`);
}
export async function removeMember(fd) {
  await requireUser(["admin"]);
  const div = +fd.get("division_id");
  await q("UPDATE users SET division_id=NULL WHERE id=$1 AND role='employee' AND division_id=$2", [+fd.get("user_id"), div]);
  redirect(`/divisions?sel=${div}`);
}

/* ---------- Jenis cuti ---------- */
export async function saveLeaveType(fd) {
  await requireUser(["admin"]);
  const id = +fd.get("id") || null, B = id ? `/leave-types?edit=${id}` : "/leave-types";
  const name = g(fd, "name"), quota = g(fd, "quota_days") === "" ? null : parseFloat(g(fd, "quota_days"));
  const notice = parseInt(g(fd, "min_notice_days") || "0"), late = parseInt(g(fd, "max_late_days") || "0");
  if (!name) go(B, "Nama jenis cuti wajib diisi.");
  if ((quota != null && quota < 0) || notice < 0 || late < 0 || Number.isNaN(notice) || Number.isNaN(late)) go(B, "Angka tidak boleh negatif.");
  const vals = [name, quota, notice, late, fd.get("requires_attachment") === "1", fd.get("deducts_annual_quota") === "1", fd.get("is_active") !== "0"];
  try {
    if (id) await q(`UPDATE leave_types SET name=$1, quota_days=$2, min_notice_days=$3, max_late_days=$4,
        requires_attachment=$5, deducts_annual_quota=$6, is_active=$7 WHERE id=$8`, [...vals, id]);
    else await q(`INSERT INTO leave_types (name, quota_days, min_notice_days, max_late_days, requires_attachment, deducts_annual_quota, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, vals);
  } catch (e) { go(B, dupMsg(e)); }
  go("/leave-types", "Jenis cuti disimpan.", "ok");
}

/* ---------- Fitur lanjutan ---------- */
export async function saveHoliday(fd) {
  await requireUser(["admin"]);
  const id = +fd.get("id") || null, B = "/holidays";
  if (!g(fd, "date") || !g(fd, "name")) go(B, "Tanggal dan keterangan wajib diisi.");
  const type = fd.get("type") === "collective" ? "collective" : "national";
  try {
    if (id) await q("UPDATE holidays SET date=$1, name=$2, type=$3 WHERE id=$4", [g(fd, "date"), g(fd, "name"), type, id]);
    else await q("INSERT INTO holidays (date, name, type) VALUES ($1,$2,$3)", [g(fd, "date"), g(fd, "name"), type]);
  } catch (e) { go(B, "Tanggal tersebut sudah terdaftar."); }
  go(B, "Hari libur disimpan.", "ok");
}
export async function deleteHoliday(fd) { await requireUser(["admin"]); await q("DELETE FROM holidays WHERE id=$1", [+fd.get("id")]); redirect("/holidays"); }
export async function saveCapacity(fd) {
  await requireUser(["admin"]);
  const p = parseInt(g(fd, "percent"));
  if (!(p >= 1 && p <= 100)) go("/holidays", "Persentase harus 1 sampai 100.");
  await q("INSERT INTO settings (key, value) VALUES ('capacity_percent',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [String(p)]);
  go("/holidays", "Batas kapasitas disimpan.", "ok");
}
export async function saveBlackout(fd) {
  await requireUser(["admin"]);
  if (!g(fd, "start_date") || !g(fd, "end_date") || g(fd, "end_date") < g(fd, "start_date")) go("/holidays", "Periode blackout tidak valid.");
  await q("INSERT INTO blackout_periods (start_date, end_date, note) VALUES ($1,$2,$3)", [g(fd, "start_date"), g(fd, "end_date"), g(fd, "note")]);
  go("/holidays", "Blackout ditambahkan.", "ok");
}
export async function deleteBlackout(fd) { await requireUser(["admin"]); await q("DELETE FROM blackout_periods WHERE id=$1", [+fd.get("id")]); redirect("/holidays"); }
