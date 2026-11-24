import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { saveHoliday, deleteHoliday, saveCapacity, saveBlackout, deleteBlackout } from "@/app/actions/admin";
import { Alert, Badge, Card, Field, Table, Td, Title, inp, btn, btn2, btnR } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/fmt";

export default async function Holidays({ searchParams }) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const hol = await q("SELECT * FROM holidays ORDER BY date");
  const edit = sp.edit ? hol.find((h) => h.id === +sp.edit) : null;
  const bo = await q("SELECT * FROM blackout_periods ORDER BY start_date");
  const cap = (await q1("SELECT value FROM settings WHERE key='capacity_percent'"))?.value || "30";
  const left = await q(`SELECT u.full_name, u.leave_quota, d.name AS division FROM users u LEFT JOIN divisions d ON d.id=u.division_id
                        WHERE u.is_active AND u.role IN ('employee','leader') AND u.leave_quota >= 5 ORDER BY u.leave_quota DESC LIMIT 10`);
  const daysLeft = (await q1("SELECT (make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,12,31) - CURRENT_DATE) AS n")).n;
  return (
    <>
      <Title title="Fitur Lanjutan" sub="Hari libur, kapasitas tim, blackout, dan peringatan kuota hangus" />
      <Alert err={sp.err} ok={sp.ok} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-lg font-bold">Hari libur dan cuti bersama</h2>
          <Table head={["Tanggal", "Keterangan", "Jenis", "Aksi"]}>
            {hol.map((h) => (
              <tr key={h.id}><Td>{fmtDate(h.date)}</Td><Td>{h.name}</Td>
                <Td><Badge c={h.type === "national" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{h.type === "national" ? "Libur nasional" : "Cuti bersama"}</Badge></Td>
                <Td><div className="flex gap-1"><Link href={`/holidays?edit=${h.id}`} className={btn2}>Edit</Link>
                  <form action={deleteHoliday}><input type="hidden" name="id" value={h.id} /><button className={btnR}>Hapus</button></form></div></Td></tr>))}
          </Table>
          <form action={saveHoliday} key={edit?.id || "new"} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3"><input type="hidden" name="id" value={edit?.id || ""} />
            <Field label="Tanggal"><input type="date" name="date" defaultValue={edit?.date} required className={inp} /></Field>
            <Field label="Keterangan"><input name="name" defaultValue={edit?.name} required className={inp} /></Field>
            <Field label="Jenis"><select name="type" defaultValue={edit?.type || "national"} className={inp}><option value="national">Libur nasional</option><option value="collective">Cuti bersama</option></select></Field>
            <div><button className={btn}>{edit ? "Simpan perubahan" : "Tambah"}</button></div></form>
          <p className="mt-2 text-xs text-slate-500">Hari libur tidak dihitung sebagai hari cuti pada form pengajuan.</p>
        </Card>
        <Card><h2 className="mb-3 text-lg font-bold">Kapasitas tim dan blackout</h2>
          <form action={saveCapacity} className="mb-4 flex items-end gap-2"><Field label="Maksimal karyawan satu divisi cuti bersamaan (%)"><input name="percent" type="number" min="1" max="100" defaultValue={cap} className={inp} /></Field><button className={btn}>Simpan</button></form>
          <ul className="mb-4 divide-y text-sm">{bo.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2"><span>{fmtDate(b.start_date)} sampai {fmtDate(b.end_date)}<br /><span className="text-slate-500">{b.note}</span></span>
              <form action={deleteBlackout}><input type="hidden" name="id" value={b.id} /><button className={btnR}>Hapus</button></form></li>))}</ul>
          <form action={saveBlackout} className="grid gap-3 border-t pt-4 sm:grid-cols-2">
            <Field label="Blackout mulai"><input type="date" name="start_date" required className={inp} /></Field>
            <Field label="Blackout selesai"><input type="date" name="end_date" required className={inp} /></Field>
            <Field label="Keterangan" className="sm:col-span-2"><input name="note" className={inp} /></Field>
            <div><button className={btn}>Tambah blackout</button></div></form>
          <p className="mt-2 text-xs text-slate-500">Pengajuan pada tanggal blackout ditolak saat submit. Peringatan batas kapasitas muncul di halaman Persetujuan Final HRD.</p>
        </Card>
        <Card className="lg:col-span-2"><h2 className="text-lg font-bold">Peringatan kuota hangus</h2>
          <p className="mb-3 text-sm text-slate-500">Sisa kuota besar menjelang akhir tahun. {daysLeft} hari tersisa sampai 31 Desember.</p>
          <Table head={["Karyawan", "Divisi", "Sisa"]}>{left.map((l) => <tr key={l.full_name}><Td><b>{l.full_name}</b></Td><Td>{l.division || "-"}</Td><Td><Badge c="bg-red-100 text-red-800">{fmtNum(l.leave_quota)} hari</Badge></Td></tr>)}</Table>
        </Card>
      </div>
    </>
  );
}
