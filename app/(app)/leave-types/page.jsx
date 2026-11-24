import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { saveLeaveType } from "@/app/actions/admin";
import { Alert, Badge, Card, Field, Table, Td, Title, inp, btn, btn2 } from "@/components/ui";
import { fmtNum } from "@/lib/fmt";

const yn = (v) => <Badge c={v ? "bg-green-100 text-green-800" : ""}>{v ? "Ya" : "Tidak"}</Badge>;
export default async function LeaveTypes({ searchParams }) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const rows = await q("SELECT * FROM leave_types ORDER BY id");
  const edit = sp.edit ? rows.find((r) => r.id === +sp.edit) : null;
  return (
    <>
      <Title title="Jenis Cuti" sub="Disimpan di database, bukan hardcode. Aturan tiap jenis diatur Admin."><Link href="/leave-types#form" className={btn}>Tambah jenis cuti</Link></Title>
      <Alert err={sp.err} ok={sp.ok} />
      <Card className="mb-5">
        <Table head={["Jenis cuti", "Kuota per tahun", "Batas pengajuan", "Lampiran", "Potong kuota tahunan", "Status", "Aksi"]}>
          {rows.map((t) => (
            <tr key={t.id}><Td><b>{t.name}</b>{t.is_system && <><br /><span className="text-slate-500">Bawaan sistem</span></>}</Td>
              <Td>{t.quota_days == null ? "Tanpa batas" : `${fmtNum(t.quota_days)} hari`}</Td>
              <Td>{t.min_notice_days > 0 ? `Minimal H-${t.min_notice_days}` : "H-0"}{t.max_late_days > 0 && `, maksimal ${t.max_late_days} hari setelah mulai`}</Td>
              <Td>{t.requires_attachment ? "Wajib" : "Tidak wajib"}</Td><Td>{yn(t.deducts_annual_quota)}</Td>
              <Td><Badge c={t.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{t.is_active ? "Aktif" : "Nonaktif"}</Badge></Td>
              <Td><Link href={`/leave-types?edit=${t.id}#form`} className={btn2}>Edit</Link></Td></tr>))}
        </Table>
      </Card>
      <Card><h2 id="form" className="mb-4 text-lg font-bold">{edit ? `Edit ${edit.name}` : "Tambah jenis cuti"}</h2>
        <form action={saveLeaveType} key={edit?.id || "new"} className="grid gap-4 sm:grid-cols-4"><input type="hidden" name="id" value={edit?.id || ""} />
          <Field label="Nama jenis cuti"><input name="name" defaultValue={edit?.name} required className={inp} /></Field>
          <Field label="Kuota per tahun (hari, kosong = tanpa batas)"><input name="quota_days" type="number" step="0.5" min="0" defaultValue={edit?.quota_days ?? ""} className={inp} /></Field>
          <Field label="Minimal diajukan sebelum mulai (hari)"><input name="min_notice_days" type="number" min="0" defaultValue={edit?.min_notice_days ?? 0} className={inp} /></Field>
          <Field label="Boleh diajukan mundur (hari)"><input name="max_late_days" type="number" min="0" defaultValue={edit?.max_late_days ?? 0} className={inp} /></Field>
          <Field label="Lampiran"><select name="requires_attachment" defaultValue={edit?.requires_attachment ? "1" : "0"} className={inp}><option value="0">Tidak wajib</option><option value="1">Wajib</option></select></Field>
          <Field label="Potong kuota cuti tahunan"><select name="deducts_annual_quota" defaultValue={edit?.deducts_annual_quota ? "1" : "0"} className={inp}><option value="0">Tidak</option><option value="1">Ya</option></select></Field>
          <Field label="Status"><select name="is_active" defaultValue={edit && !edit.is_active ? "0" : "1"} className={inp}><option value="1">Aktif</option><option value="0">Nonaktif</option></select></Field>
          <div className="flex items-end gap-2"><button className={btn}>Simpan</button><Link href="/leave-types" className={btn2}>Batal</Link></div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Jenis cuti yang sudah dipakai pengajuan tidak dihapus. Nonaktifkan agar tidak muncul di form.</p>
      </Card>
    </>
  );
}
