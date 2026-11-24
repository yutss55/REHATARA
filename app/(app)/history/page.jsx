import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { Card, Status, SL, Table, Td, Title, btn2, inp, Field } from "@/components/ui";
import { fmtDate, fmtPeriod, fmtNum } from "@/lib/fmt";

export default async function History({ searchParams }) {
  const u = await requireUser();
  const sp = await searchParams;
  const scope = u.role === "employee" ? "r.user_id=$1"
    : u.role === "leader" ? "(r.user_id=$1 OR e.division_id=$2)" : "($1::int IS NOT NULL AND $2::int IS NOT DISTINCT FROM $2)";
  const rows = await q(
    `SELECT r.*, t.name AS type_name, e.full_name AS emp_name, d.name AS div_name FROM leave_requests r
     JOIN leave_types t ON t.id=r.leave_type_id JOIN users e ON e.id=r.user_id LEFT JOIN divisions d ON d.id=e.division_id
     WHERE ${scope} AND ($3::text IS NULL OR r.status=$3) ORDER BY r.created_at DESC LIMIT 200`,
    [u.id, u.division_id, sp.status || null]);
  return (
    <>
      <Title title={u.role === "employee" ? "Riwayat Pengajuan" : "Riwayat Semua Pengajuan"} sub="Seluruh status, hanya baca." />
      <Card>
        <form className="mb-4 flex items-end gap-3">
          <Field label="Status"><select name="status" defaultValue={sp.status || ""} className={inp}><option value="">Semua</option>{Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <button className={btn2}>Terapkan</button>
        </form>
        <Table head={["Diajukan", "Karyawan", "Jenis", "Periode", "Hari", "Status", "Aksi"]}>
          {rows.map((r) => (
            <tr key={r.id}><Td>{fmtDate(r.created_at.toISOString().slice(0, 10))}</Td>
              <Td>{r.emp_name}<br /><span className="text-slate-500">{r.div_name}</span></Td><Td>{r.type_name}</Td>
              <Td>{fmtPeriod(r.start_date, r.end_date)}</Td><Td>{fmtNum(r.total_days)}</Td><Td><Status s={r.status} /></Td>
              <Td><Link className={btn2} href={`/leaves/${r.id}`}>Detail</Link></Td></tr>
          ))}
          {!rows.length && <tr><Td>Belum ada data.</Td></tr>}
        </Table>
      </Card>
    </>
  );
}
