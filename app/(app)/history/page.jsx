import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { Card, Status, SL, Table, Td, Title, btn2, inp, Field } from "@/components/ui";
import { fmtDate, fmtPeriod, fmtNum } from "@/lib/fmt";

export default async function History({ searchParams }) {
  const u = await requireUser();
  const sp = await searchParams;
  const status = sp.status || null;

  let scope;
  let params;

  if (u.role === "employee") {
    scope = "r.user_id = $1";
    params = [u.id, status];
  } else if (u.role === "leader") {
    scope = "(r.user_id = $1 OR e.division_id = $2)";
    params = [u.id, u.division_id, status];
  } else {
    scope = "TRUE";
    params = [status];
  }

  const st = `$${params.length}`;

  const rows = await q(
    `SELECT r.*, t.name AS type_name, e.full_name AS emp_name, d.name AS div_name
     FROM leave_requests r
     JOIN leave_types t ON t.id = r.leave_type_id
     JOIN users e ON e.id = r.user_id
     LEFT JOIN divisions d ON d.id = e.division_id
     WHERE ${scope} AND (${st}::text IS NULL OR r.status = ${st})
     ORDER BY r.created_at DESC
     LIMIT 200`,
    params
  );

  const title = u.role === "employee" ? "Riwayat Pengajuan" : "Riwayat Semua Pengajuan";

  return (
    <>
      <Title title={title} sub="Seluruh status, hanya baca." />

      <Card>
        <form className="mb-4 flex items-end gap-3">
          <Field label="Status">
            <select name="status" defaultValue={sp.status || ""} className={inp}>
              <option value="">Semua</option>
              {Object.entries(SL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <button className={btn2}>Terapkan</button>
        </form>

        <Table head={["Diajukan", "Karyawan", "Jenis", "Periode", "Hari", "Status", "Aksi"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{fmtDate(r.created_at.toISOString().slice(0, 10))}</Td>
              <Td>
                {r.emp_name}
                <br />
                <span className="text-slate-500">{r.div_name}</span>
              </Td>
              <Td>{r.type_name}</Td>
              <Td>{fmtPeriod(r.start_date, r.end_date)}</Td>
              <Td>{fmtNum(r.total_days)}</Td>
              <Td>
                <Status s={r.status} />
              </Td>
              <Td>
                <Link className={btn2} href={`/leaves/${r.id}`}>
                  Detail
                </Link>
              </Td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <Td>Belum ada data.</Td>
            </tr>
          )}
        </Table>
      </Card>
    </>
  );
}