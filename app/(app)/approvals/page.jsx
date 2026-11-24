import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { processApprovals } from "@/app/actions/approval";
import { Alert, Card, Status, Table, Td, Title, inp, btn, btn2, btnR } from "@/components/ui";
import { fmtDate, fmtPeriod, fmtNum } from "@/lib/fmt";

export default async function Approvals({ searchParams }) {
  const u = await requireUser(["leader", "hrd"]);
  const sp = await searchParams;
  const isHrd = u.role === "hrd";
  const rows = await q(
    `SELECT r.*, t.name AS type_name, t.deducts_annual_quota AS ded, e.full_name AS emp_name, e.role AS erole,
       e.division_id AS edv, e.leave_quota AS quota, d.name AS div_name, s.full_name AS sub_name,
       la.full_name AS lead_name, la.note AS lead_note, la.decided_at AS lead_at
     FROM leave_requests r JOIN leave_types t ON t.id=r.leave_type_id JOIN users e ON e.id=r.user_id
     LEFT JOIN divisions d ON d.id=e.division_id LEFT JOIN users s ON s.id=r.substitute_id
     LEFT JOIN LATERAL (SELECT p.full_name, a.note, a.decided_at FROM leave_approvals a JOIN users p ON p.id=a.approver_id
        WHERE a.request_id=r.id AND a.level='leader' ORDER BY a.decided_at DESC LIMIT 1) la ON true
     WHERE ${isHrd ? "(r.status='approved_leader' OR (r.status='pending' AND e.role='leader'))"
                   : "r.status='pending' AND e.role='employee' AND e.division_id=$1"}
     ORDER BY r.created_at`, isHrd ? [] : [u.division_id]);

  let cap = null, limit = 30;
  if (isHrd) {
    limit = +(await q1("SELECT value FROM settings WHERE key='capacity_percent'"))?.value || 30;
    for (const r of rows) {
      const c = await q1(
        `SELECT COUNT(DISTINCT x.user_id)::int AS n, (SELECT COUNT(*)::int FROM users WHERE division_id=$1 AND is_active) AS total
         FROM leave_requests x JOIN users xu ON xu.id=x.user_id
         WHERE xu.division_id=$1 AND x.user_id<>$2 AND x.status IN ('approved_leader','approved')
           AND x.start_date <= $4 AND x.end_date >= $3`, [r.edv, r.user_id, r.start_date, r.end_date]);
      r.pct = c.total ? Math.round(((c.n + 1) / c.total) * 100) : 0;
      r.over = r.pct > limit;
    }
    cap = rows.filter((r) => r.over);
  }
  return (
    <form action={processApprovals}>
      <Title title={isHrd ? "Persetujuan Final" : "Verifikasi Pengajuan Cuti"}
        sub={isHrd ? `${rows.length} pengajuan menunggu persetujuan final` : `${rows.length} pengajuan dari anggota ${u.division_name} menunggu keputusan Anda`}>
        <div className="flex gap-2">
          <button name="decision" value="approved" className={btn}>Approve terpilih</button>
          <button name="decision" value="rejected" className={btnR}>Reject terpilih</button>
        </div>
      </Title>
      <Alert err={sp?.err} ok={sp?.ok} />
      {cap?.map((r) => (
        <p key={r.id} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <b>Batas kapasitas tim.</b> Divisi {r.div_name}: {r.pct}% anggota akan cuti pada {fmtPeriod(r.start_date, r.end_date)}. Batas maksimal {limit}%. Menyetujui pengajuan {r.emp_name} melampaui batas.
        </p>
      ))}
      <Card>
        <Table head={["", "Karyawan", "Jenis dan periode", "Sisa kuota", ...(isHrd ? ["Disetujui atasan", "Kapasitas divisi"] : ["Alasan dan handover"]), "Catatan", "Aksi"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td><input type="checkbox" name="ids" value={r.id} aria-label={`Pilih ${r.emp_name}`} /></Td>
              <Td><b>{r.emp_name}</b><br /><span className="text-slate-500">{r.div_name}</span></Td>
              <Td>{r.type_name}<br />{fmtPeriod(r.start_date, r.end_date)} ({fmtNum(r.total_days)} hari)<br />
                <Link className="text-xs text-teal-700 underline" href={`/leaves/${r.id}`}>Detail</Link>
                {r.attachment_path && <> · <a className="text-xs text-teal-700 underline" target="_blank" href={`/api/files/${r.attachment_path}`}>Lihat lampiran</a></>}</Td>
              <Td>{r.ded ? `${fmtNum(r.quota + r.total_days)} menjadi ${fmtNum(r.quota)}` : "Tidak memotong kuota"}</Td>
              {isHrd ? (<>
                <Td>{r.lead_name ? <>{r.lead_name}<br />{fmtDate(r.lead_at.toISOString().slice(0, 10))}{r.lead_note && <p className="italic">"{r.lead_note}"</p>}</> : "Langsung ke HRD (Ketua Divisi)"}</Td>
                <Td><span className={r.over ? "font-bold text-amber-700" : ""}>{r.pct}%{r.over ? `, melewati batas ${limit}%` : ", aman"}</span></Td>
              </>) : <Td>{r.reason}<br /><span className="text-slate-500">Handover: {r.handover_note || "-"} (pengganti {r.sub_name})</span></Td>}
              <Td><input name={`note_${r.id}`} placeholder="Catatan (wajib saat reject)" className={inp} /></Td>
              <Td><div className="flex flex-col gap-1"><button name="one" value={`approved:${r.id}`} className={btn2}>Approve</button><button name="one" value={`rejected:${r.id}`} className={btnR}>Reject</button></div></Td>
            </tr>
          ))}
          {!rows.length && <tr><Td>Tidak ada pengajuan yang menunggu keputusan.</Td></tr>}
        </Table>
      </Card>
      <p className="mt-3 text-xs text-slate-500">Catatan wajib diisi saat Reject. Reject mengembalikan kuota otomatis. {isHrd && "Ketua Divisi yang mengajukan cuti langsung ke HRD ditampilkan tanpa data atasan."}</p>
    </form>
  );
}
