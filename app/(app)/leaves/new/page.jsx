import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { submitLeave } from "@/app/actions/leave";
import { Alert, Card, Field, Title, inp, btn, btn2 } from "@/components/ui";
import { fmtDate, fmtNum } from "@/lib/fmt";

export default async function NewLeave({ searchParams }) {
  const u = await requireUser(["employee", "leader"]);
  const sp = await searchParams;
  const types = await q("SELECT * FROM leave_types WHERE is_active ORDER BY id");
  const subs = await q("SELECT id, full_name FROM users WHERE is_active AND division_id=$1 AND id<>$2 ORDER BY full_name", [u.division_id, u.id]);
  const [today] = (await q("SELECT to_char(CURRENT_DATE,'YYYY-MM-DD') AS d")).map((r) => r.d);
  return (
    <>
      <Title title="Ajukan Cuti" sub={`Tanggal pengajuan: ${fmtDate(today)} (otomatis)`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <Alert err={sp?.err} />
          <form action={submitLeave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jenis cuti"><select name="leave_type_id" required className={inp}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="half" /> Cuti setengah hari (0,5) — tanggal selesai diabaikan</label>
              <Field label="Tanggal mulai"><input type="date" name="start_date" required className={inp} /></Field>
              <Field label="Tanggal selesai"><input type="date" name="end_date" className={inp} /></Field>
            </div>
            <Field label="Alasan cuti"><textarea name="reason" required rows={3} className={inp} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rekan pengganti (handover)"><select name="substitute_id" required className={inp}><option value="">Pilih rekan</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
              <Field label="Nomor darurat"><input name="emergency_phone" defaultValue={u.phone || ""} className={inp} /></Field>
            </div>
            <Field label="Catatan tugas"><textarea name="handover_note" rows={3} className={inp} /></Field>
            <Field label="Alamat selama cuti"><input name="address" defaultValue={u.address || ""} className={inp} /></Field>
            <Field label="Lampiran (PDF/JPG/PNG, maks 5 MB; wajib untuk jenis tertentu)"><input type="file" name="attachment" className={inp} /></Field>
            <div className="flex gap-2"><button className={btn}>Kirim pengajuan</button><button type="reset" className={btn2}>Reset</button><Link href="/leaves" className={btn2}>Batal</Link></div>
          </form>
        </Card>
        <Card className="h-fit text-sm">
          <h2 className="mb-2 text-lg font-bold">Ringkasan kuota</h2>
          <p>Sisa kuota saat ini: <b>{fmtNum(u.leave_quota)} hari</b></p>
          <p className="mt-3 text-slate-500">Total hari kerja dihitung otomatis, tidak termasuk Sabtu, Minggu, dan libur nasional. Sistem memeriksa kuota, bentrok tanggal, blackout, batas H-n, dan lampiran saat pengajuan dikirim. Rekan pengganti menerima pengajuan sebagai handover.</p>
        </Card>
      </div>
    </>
  );
}
