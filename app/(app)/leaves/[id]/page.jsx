import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getRequest, canView } from "@/lib/leave";
import { cancelLeave } from "@/app/actions/leave";
import { Alert, Card, Status, Title, inp, btn2, btnR } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtPeriod, fmtNum } from "@/lib/fmt";

const Item = ({ k, v }) => <div><dt className="text-xs font-semibold uppercase text-slate-500">{k}</dt><dd className="text-sm">{v || "-"}</dd></div>;

export default async function Detail({ params, searchParams }) {
  const u = await requireUser();
  const { id } = await params; const sp = await searchParams;
  const r = await getRequest(+id);
  if (!r || !canView(u, r)) notFound();
  const ap = await q("SELECT a.*, p.full_name FROM leave_approvals a JOIN users p ON p.id=a.approver_id WHERE request_id=$1 ORDER BY decided_at", [r.id]);
  const created = r.created_at.toISOString().slice(0, 10);
  return (
    <>
      <Link href="/history" className="text-sm text-teal-700">Kembali ke daftar</Link>
      <Title title={`${r.type_name}, ${fmtPeriod(r.start_date, r.end_date)}`}><Status s={r.status} /></Title>
      <Alert err={sp?.err} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Rincian pengajuan</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item k="Pegawai" v={r.emp_name} /><Item k="Diajukan" v={fmtDate(created)} />
            <Item k="Periode" v={fmtPeriod(r.start_date, r.end_date)} /><Item k="Total hari" v={`${fmtNum(r.total_days)} hari kerja`} />
            <Item k="Rekan pengganti" v={r.sub_name} /><Item k="Nomor darurat" v={r.emergency_phone} />
            <Item k="Alamat selama cuti" v={r.address} /><Item k="Alasan" v={r.reason} />
            <Item k="Catatan tugas (handover)" v={r.handover_note} />
            {r.cancel_reason && <Item k="Alasan pembatalan" v={r.cancel_reason} />}
          </dl>
          {r.attachment_path && (
            <div className="mt-5 flex items-center justify-between rounded-lg border border-dashed p-3 text-sm">
              <span>Lampiran: {r.attachment_path.slice(-12)}</span><a className={btn2} href={`/api/files/${r.attachment_path}`} target="_blank">Lihat</a>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            {r.status === "approved" && ["employee", "leader", "hrd", "admin"].includes(u.role)
              ? <a className={btn2} href={`/api/leaves/${r.id}/pdf`}>Unduh surat cuti (PDF)</a>
              : <><span className={`${btn2} opacity-50`}>Unduh surat cuti (PDF)</span><span className="text-slate-500">Tersedia setelah HRD menyetujui</span></>}
          </div>
          {r.status === "pending" && r.user_id === u.id && (
            <form action={cancelLeave} className="mt-5 space-y-2 border-t pt-4">
              <input type="hidden" name="id" value={r.id} />
              <label className="text-xs font-semibold">Alasan pembatalan (wajib)</label>
              <input name="cancel_reason" required className={inp} />
              <button className={btnR}>Batalkan pengajuan</button>
            </form>
          )}
        </Card>
        <Card className="h-fit">
          <h2 className="mb-4 text-lg font-bold">Timeline persetujuan</h2>
          <ol className="space-y-4 border-l-2 border-teal-700 pl-4 text-sm">
            <li><b>Diajukan {r.erole === "leader" ? "Ketua Divisi" : "Karyawan"}</b><br /><span className="text-slate-500">{fmtDateTime(r.created_at)}</span></li>
            {ap.map((a) => (
              <li key={a.id}>
                <b>{a.decision === "approved" ? "Disetujui" : "Ditolak"} {a.level === "leader" ? "Ketua Divisi" : "HRD"}</b><br />
                <span className="text-slate-500">{a.full_name}, {fmtDateTime(a.decided_at)}</span>
                {a.note && <p>Catatan: {a.note}</p>}
              </li>
            ))}
            {r.status === "pending" && <li><b>Menunggu {r.erole === "leader" ? "persetujuan HRD" : "verifikasi Ketua Divisi"}</b></li>}
            {r.status === "approved_leader" && <li><b>Menunggu persetujuan HRD</b></li>}
            {r.status === "cancelled" && <li><b>Dibatalkan oleh pemohon</b></li>}
          </ol>
        </Card>
      </div>
    </>
  );
}
