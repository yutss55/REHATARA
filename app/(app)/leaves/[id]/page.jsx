import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getRequest, canView } from "@/lib/leave";
import { cancelLeave } from "@/app/actions/leave";
import { Alert, Card, Status, Title, inp, btn2, btnR } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtPeriod, fmtNum } from "@/lib/fmt";

const Item = ({ k, v }) => (
  <div>
    <dt className="text-xs font-semibold uppercase text-slate-500">{k}</dt>
    <dd className="text-sm">{v || "-"}</dd>
  </div>
);

export default async function Detail({ params, searchParams }) {
  const u = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const r = await getRequest(+id);
  if (!r || !canView(u, r)) notFound();

  const ap = await q(
    `SELECT a.*, p.full_name FROM leave_approvals a
     JOIN users p ON p.id = a.approver_id
     WHERE request_id = $1
     ORDER BY decided_at`,
    [r.id]
  );

  const created = r.created_at.toISOString().slice(0, 10);

  const hrdName = (
    await q("SELECT full_name FROM users WHERE role = 'hrd' AND is_active ORDER BY id LIMIT 1")
  )[0]?.full_name;

  const leadName = (
    await q(
      `SELECT l.full_name FROM divisions d
       JOIN users l ON l.id = d.leader_id
       WHERE d.id = $1`,
      [r.edv]
    )
  )[0]?.full_name;

  const steps = [
    {
      title: `Diajukan ${r.erole === "leader" ? "Ketua Divisi" : "Karyawan"}`,
      sub: fmtDateTime(r.created_at),
      c: "bg-teal-700",
    },
    ...ap.map((a) => ({
      title: `${a.decision === "approved" ? "Disetujui" : "Ditolak"} ${a.level === "leader" ? "Ketua Divisi" : "HRD"}`,
      sub: `${a.full_name}, ${fmtDateTime(a.decided_at)}`,
      note: a.note ? `Catatan: ${a.note}` : null,
      c: a.decision === "approved" ? "bg-teal-700" : "bg-red-700",
    })),
  ];

  if (r.status === "pending" && r.erole === "employee") {
    steps.push({ title: "Menunggu verifikasi Ketua Divisi", sub: leadName, c: "bg-amber-600" });
  }

  if (r.status === "approved_leader" || (r.status === "pending" && r.erole === "leader")) {
    steps.push({ title: "Menunggu persetujuan HRD", sub: hrdName, c: "bg-amber-600" });
  }

  if (r.status === "cancelled") {
    steps.push({ title: "Dibatalkan oleh pemohon", sub: r.cancel_reason, c: "bg-slate-500" });
  }

  const rejectNote = r.status === "rejected" ? ap[ap.length - 1]?.note : null;
  const canDownload = r.status === "approved" && ["employee", "leader", "hrd", "admin"].includes(u.role);

  return (
    <>
      <Link href="/history" className="text-sm text-teal-700">
        Kembali ke daftar
      </Link>

      <Title title={`${r.type_name}, ${fmtPeriod(r.start_date, r.end_date)}`}>
        <Status s={r.status} />
      </Title>

      <Alert err={sp?.err} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Rincian pengajuan</h2>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Item k="Pegawai" v={r.emp_name} />
            <Item k="Diajukan" v={fmtDate(created)} />
            <Item k="Periode" v={fmtPeriod(r.start_date, r.end_date)} />
            <Item k="Total hari" v={`${fmtNum(r.total_days)} hari kerja`} />
            <Item k="Rekan pengganti" v={r.sub_name} />
            <Item k="Nomor darurat" v={r.emergency_phone} />
            <Item k="Alamat selama cuti" v={r.address} />
            <Item k="Alasan" v={r.reason} />
            <Item k="Catatan tugas (handover)" v={r.handover_note} />
            {r.cancel_reason && <Item k="Alasan pembatalan" v={r.cancel_reason} />}
          </dl>

          {r.attachment_path && (
            <div className="mt-5 flex items-center justify-between rounded-lg border border-dashed p-3 text-sm">
              <span>Lampiran: {r.attachment_path.slice(-12)}</span>
              <a className={btn2} href={`/api/files/${r.attachment_path}`} target="_blank">
                Lihat
              </a>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            {canDownload ? (
              <a className={btn2} href={`/api/leaves/${r.id}/pdf`}>
                Unduh surat cuti (PDF)
              </a>
            ) : (
              <>
                <span className={`${btn2} opacity-50`}>Unduh surat cuti (PDF)</span>
                <span className="text-slate-500">Tersedia setelah HRD menyetujui</span>
              </>
            )}
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

          <ol>
            {steps.map((s, i) => (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-slate-300" />
                )}
                <span
                  className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${s.c}`}
                >
                  {i + 1}
                </span>
                <div className="text-sm">
                  <p className="font-bold">{s.title}</p>
                  {s.sub && <p className="text-slate-500">{s.sub}</p>}
                  {s.note && <p>{s.note}</p>}
                </div>
              </li>
            ))}
          </ol>

          {rejectNote && (
            <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-900">
              <b>Catatan penolakan:</b>
              <br />
              {rejectNote}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}