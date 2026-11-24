"use server";
import { redirect } from "next/navigation";
import { tx } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getRequest } from "@/lib/leave";

async function decide(u, id, decision, note) {
  const r = await getRequest(id);
  if (!r) return "Pengajuan tidak ditemukan.";
  let level;
  if (u.role === "leader" && r.status === "pending" && r.erole === "employee" && r.edv === u.division_id) level = "leader";
  else if (u.role === "hrd" && (r.status === "approved_leader" || (r.status === "pending" && r.erole === "leader"))) level = "hrd";
  else return `Pengajuan ${r.emp_name} tidak dapat diproses (status berubah atau bukan wewenang Anda).`;
  if (decision === "rejected" && !note.trim()) return `Catatan penolakan untuk ${r.emp_name} wajib diisi.`;
  const status = decision === "rejected" ? "rejected" : level === "leader" ? "approved_leader" : "approved";
  await tx(async (run) => {
    await run("UPDATE leave_requests SET status=$2 WHERE id=$1", [id, status]);
    await run("INSERT INTO leave_approvals (request_id, approver_id, level, decision, note) VALUES ($1,$2,$3,$4,$5)",
      [id, u.id, level, decision, note.trim() || null]);
    if (decision === "rejected" && r.ded)
      await run("UPDATE users SET leave_quota = leave_quota + $1 WHERE id=$2", [r.total_days, r.user_id]);
  });
  return null;
}

// Satu action untuk tombol per baris ("one"), maupun approve/reject terpilih ("decision" + ids).
export async function processApprovals(fd) {
  const u = await requireUser(["leader", "hrd"]);
  const one = fd.get("one");
  const jobs = one
    ? [[+one.split(":")[1], one.split(":")[0]]]
    : fd.getAll("ids").map((i) => [+i, fd.get("decision")]);
  if (!jobs.length) redirect("/approvals?err=" + encodeURIComponent("Pilih pengajuan terlebih dahulu."));
  const errors = [];
  for (const [id, d] of jobs) {
    const e = await decide(u, id, d, String(fd.get(`note_${id}`) || ""));
    if (e) errors.push(e);
  }
  redirect(errors.length ? "/approvals?err=" + encodeURIComponent(errors.join(" ")) : "/approvals?ok=" + encodeURIComponent("Keputusan tersimpan."));
}
