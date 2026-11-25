import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { saveHoliday, deleteHoliday, saveBlackoutSettings } from "@/app/actions/admin";
import { Alert, Badge, Card, Field, Table, Td, btn, btn2, btnR, inp } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/fmt";

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS = ["SEN","SEL","RAB","KAM","JUM","SAB","MIN"];

export default async function Holidays({ searchParams }) {
  const u = await requireUser(["admin"]);
  const sp = await searchParams;

  const hol = await q("SELECT * FROM holidays ORDER BY date");
  const edit = sp.edit ? hol.find((h) => h.id === +sp.edit) : null;
  const cap = (await q1("SELECT value FROM settings WHERE key='capacity_percent'"))?.value || "30";
  const blackout = await q1("SELECT * FROM blackout_periods ORDER BY end_date DESC, id DESC LIMIT 1");
  const left = await q(
    `SELECT u.id, u.full_name, u.leave_quota, d.name AS division FROM users u LEFT JOIN divisions d ON d.id=u.division_id
     WHERE u.is_active AND u.role IN ('employee','leader') AND u.leave_quota >= 5
     ORDER BY u.leave_quota DESC, u.full_name LIMIT 10`);
  const daysLeft = (await q1("SELECT (make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,12,31) - CURRENT_DATE) AS n")).n;
  const lastApproved = await q1("SELECT id FROM leave_requests WHERE status='approved' ORDER BY created_at DESC LIMIT 1");

  const thisYm = (await q1("SELECT to_char(CURRENT_DATE,'YYYY-MM') AS ym")).ym;
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m || "") ? sp.m : thisYm;
  const [Y, M] = ym.split("-").map(Number);
  const daysIn = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(Y, M - 1, 1)).getUTCDay() + 6) % 7; 
  const iso = (d) => `${ym}-${String(d).padStart(2, "0")}`;
  const from = iso(1), to = iso(daysIn);
  const shift = (n) => {
    const d = new Date(Date.UTC(Y, M - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const holSet = new Set(hol.filter((h) => h.date >= from && h.date <= to).map((h) => h.date));
  const bos = await q("SELECT start_date, end_date FROM blackout_periods WHERE start_date <= $2 AND end_date >= $1", [from, to]);
  const lv = await q(
    "SELECT user_id, start_date, end_date FROM leave_requests WHERE status IN ('approved_leader','approved') AND start_date <= $2 AND end_date >= $1",
    [from, to]);
  const inRange = (r, s) => r.start_date <= s && r.end_date >= s;
  const cellClass = (d) => {
    const s = iso(d), dow = (offset + d - 1) % 7;
    if (bos.some((b) => inRange(b, s))) return "bg-slate-900 font-semibold text-white";
    if (holSet.has(s)) return "bg-red-100 font-semibold text-red-800";
    if (dow >= 5) return "bg-slate-50 text-slate-400";
    if (lv.some((l) => l.user_id === u.id && inRange(l, s))) return "bg-teal-700 font-semibold text-white";
    if (lv.some((l) => inRange(l, s))) return "bg-blue-100 font-semibold text-blue-800";
    return "bg-slate-100";
  };
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const showForm = sp.add || edit;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Fitur Lanjutan</h1>
        <p className="text-sm text-slate-500">Opsional: hari libur, kapasitas tim, blackout, kuota hangus, dan kalender</p>
      </div>
      <Alert err={sp.err} ok={sp.ok} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Hari libur dan cuti bersama</h2>
            <Link href="/holidays?add=1" className={`${btn} px-3 py-1.5`}>Tambah</Link>
          </div>
          {showForm && (
            <form action={saveHoliday} key={edit?.id || "new"} className="mb-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={edit?.id || ""} />
              <Field label="Tanggal"><input type="date" name="date" defaultValue={edit?.date} required className={`${inp} h-10`} /></Field>
              <Field label="Keterangan"><input name="name" defaultValue={edit?.name} required maxLength={120} className={`${inp} h-10`} /></Field>
              <Field label="Jenis">
                <select name="type" defaultValue={edit?.type || "national"} className={`${inp} h-10`}>
                  <option value="national">Libur nasional</option><option value="collective">Cuti bersama</option>
                </select>
              </Field>
              <div className="flex gap-2 sm:col-span-3"><button className={btn}>Simpan</button><Link href="/holidays" className={btn2}>Batal</Link></div>
            </form>
          )}
          <Table head={["Tanggal", "Keterangan", "Jenis", "Aksi"]}>
            {hol.map((h) => (
              <tr key={h.id}>
                <Td>{fmtDate(h.date)}</Td><Td>{h.name}</Td>
                <Td><Badge c={h.type === "national" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{h.type === "national" ? "Libur nasional" : "Cuti bersama"}</Badge></Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    <Link href={`/holidays?edit=${h.id}`} className={`${btn2} py-1 text-xs`}>Edit</Link>
                    <form action={deleteHoliday}><input type="hidden" name="id" value={h.id} /><button className={`${btn2} py-1 text-xs`}>Hapus</button></form>
                  </div>
                </Td>
              </tr>
            ))}
            {!hol.length && <tr><Td colSpan={4} className="py-6 text-center text-slate-500">Belum ada hari libur.</Td></tr>}
          </Table>
          <p className="mt-3 text-xs text-slate-500">Hari libur tidak dihitung sebagai hari cuti pada form pengajuan.</p>
        </Card>

        <Card className="h-fit">
          <h2 className="mb-3 text-lg font-bold">Kapasitas tim dan blackout</h2>
          <form action={saveBlackoutSettings} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={blackout?.id || ""} />
            <Field label="Maksimal karyawan satu divisi cuti bersamaan (%)" className="sm:col-span-2">
              <input name="percent" type="number" min="1" max="100" defaultValue={cap} required className={`${inp} h-10`} />
            </Field>
            <Field label="Blackout mulai"><input type="date" name="start_date" defaultValue={blackout?.start_date} className={`${inp} h-10`} /></Field>
            <Field label="Blackout selesai"><input type="date" name="end_date" defaultValue={blackout?.end_date} className={`${inp} h-10`} /></Field>
            <Field label="Keterangan" className="sm:col-span-2"><input name="note" defaultValue={blackout?.note || ""} maxLength={200} className={`${inp} h-10`} /></Field>
            <div className="sm:col-span-2"><button className={btn}>Simpan</button></div>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Pengajuan pada tanggal blackout ditolak saat submit. Peringatan limit kapasitas muncul di halaman Persetujuan Final HRD.
            Kosongkan kedua tanggal lalu Simpan untuk menghapus blackout.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Peringatan kuota hangus</h2>
          <p className="mb-3 text-sm text-slate-500">Sisa kuota besar menjelang akhir tahun. {daysLeft} hari tersisa sampai 31 Desember.</p>
          <Table head={["Karyawan", "Divisi", "Sisa"]}>
            {left.map((l) => (
              <tr key={l.id}>
                <Td><b>{l.full_name}</b></Td><Td>{l.division || "-"}</Td>
                <Td><Badge c={l.leave_quota >= 10 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{fmtNum(l.leave_quota)} hari</Badge></Td>
              </tr>
            ))}
            {!left.length && <tr><Td colSpan={3} className="py-6 text-center text-slate-500">Tidak ada karyawan dengan sisa kuota besar.</Td></tr>}
          </Table>
        </Card>

        <Card className="h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Kalender {MONTHS[M - 1]} {Y}</h2>
            <div className="flex gap-1">
              <Link href={`/holidays?m=${shift(-1)}`} scroll={false} className={`${btn2} px-2 py-1`} aria-label="Bulan sebelumnya">‹</Link>
              <Link href={`/holidays?m=${shift(1)}`} scroll={false} className={`${btn2} px-2 py-1`} aria-label="Bulan berikutnya">›</Link>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DAYS.map((d) => <div key={d} className="pb-1 text-[11px] font-bold text-slate-500">{d}</div>)}
            {cells.map((d, i) =>
              d ? <div key={i} className={`grid h-10 place-items-center rounded-lg text-sm ${cellClass(d)}`}>{d}</div>
                : <div key={i} className="h-10 rounded-lg bg-slate-100" />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {[["bg-teal-700", "Pengajuan Anda"], ["bg-blue-100", "Cuti disetujui"], ["bg-red-100", "Libur"], ["bg-slate-900", "Blackout"]].map(([c, t]) => (
              <span key={t} className="flex items-center gap-1.5"><i className={`inline-block h-3 w-3 rounded ${c}`} />{t}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Menampilkan cuti yang sudah disetujui, libur, dan blackout pada bulan ini.</p>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 text-lg font-bold">Surat cuti PDF dan riwayat</h2>
        <div className="flex flex-wrap gap-2">
          {lastApproved
            ? <a href={`/api/leaves/${lastApproved.id}/pdf`} className={btn}>Unduh surat cuti (PDF)</a>
            : <span className={`${btn} cursor-not-allowed opacity-50`}>Unduh surat cuti (PDF)</span>}
        </div>
        <p className="mt-2 text-xs text-slate-500">Muncul di detail cuti berstatus Approved, untuk Karyawan dan Ketua Divisi. Riwayat pengajuan dapat dilihat semua role.</p>
      </Card>
    </>
  );
}