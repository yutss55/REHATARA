import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDate, fmtPeriod, fmtNum } from "@/lib/fmt";
import { Card, Status, SL, Table, Td, Title, btn, btn2, inp, Field } from "@/components/ui";

export default async function Leaves({ searchParams }) {
  const u = await requireUser(["employee", "leader"]);
  const sp = await searchParams;
  const year = +sp.year || new Date().getFullYear();
  const all = await q(
    `SELECT r.*, t.name AS type_name, s.full_name AS sub_name FROM leave_requests r
     JOIN leave_types t ON t.id=r.leave_type_id LEFT JOIN users s ON s.id=r.substitute_id
     WHERE r.user_id=$1 AND EXTRACT(YEAR FROM r.created_at)=$2 AND ($3::int IS NULL OR r.leave_type_id=$3)
     ORDER BY r.created_at ${sp.sort === "lama" ? "ASC" : "DESC"}`, [u.id, year, +sp.type || null]);
  const rows = sp.status ? all.filter((r) => r.status === sp.status) : all;
  const types = await q("SELECT id, name FROM leave_types ORDER BY id");
  const count = (s) => all.filter((r) => r.status === s).length;
  const qs = (o) => "?" + new URLSearchParams({ year, ...(sp.type && { type: sp.type }), ...o }).toString();
  return (
    <>
      <Title title={u.role === "leader" ? "Cuti Saya" : "Pengajuan Cuti"} sub={`Sisa kuota cuti tahunan: ${fmtNum(u.leave_quota)} dari 12 hari`}>
        <Link href="/leaves/new" className={btn}>Ajukan cuti</Link>
      </Title>
      <Card>
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <Link href={qs({})} className={`rounded-full border px-3 py-1 ${!sp.status ? "bg-teal-700 text-white" : ""}`}>Semua ({all.length})</Link>
          {Object.keys(SL).map((s) => (
            <Link key={s} href={qs({ status: s })} className={`rounded-full border px-3 py-1 ${sp.status === s ? "bg-teal-700 text-white" : ""}`}>{SL[s]} ({count(s)})</Link>
          ))}
        </div>
        <form className="mb-4 grid gap-3 sm:grid-cols-4">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <Field label="Jenis cuti"><select name="type" defaultValue={sp.type || ""} className={inp}><option value="">Semua jenis</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Tahun"><input name="year" type="number" defaultValue={year} className={inp} /></Field>
          <Field label="Urutkan"><select name="sort" defaultValue={sp.sort || "baru"} className={inp}><option value="baru">Tanggal pengajuan terbaru</option><option value="lama">Tanggal pengajuan terlama</option></select></Field>
          <button className={`${btn2} self-end`}>Terapkan</button>
        </form>
        <Table head={["Diajukan", "Jenis", "Periode", "Hari", "Pengganti", "Status", "Aksi"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{fmtDate(r.created_at.toISOString().slice(0, 10))}</Td><Td>{r.type_name}</Td>
              <Td>{fmtPeriod(r.start_date, r.end_date)}</Td><Td>{fmtNum(r.total_days)}</Td>
              <Td>{r.sub_name}</Td><Td><Status s={r.status} /></Td>
              <Td><Link className={btn2} href={`/leaves/${r.id}`}>Detail</Link></Td>
            </tr>
          ))}
          {!rows.length && <tr><Td>Belum ada pengajuan. Klik "Ajukan cuti" untuk memulai.</Td></tr>}
        </Table>
        <p className="mt-3 text-xs text-slate-500">Pembatalan hanya untuk status Pending (buka Detail). Kuota dikembalikan otomatis dan alasan pembatalan wajib diisi.</p>
      </Card>
    </>
  );
}
