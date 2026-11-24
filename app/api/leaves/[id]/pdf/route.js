import { PDFDocument, StandardFonts } from "pdf-lib";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getRequest, canView } from "@/lib/leave";
import { fmtPeriod, fmtDate } from "@/lib/fmt";

export async function GET(_, { params }) {
  const { id } = await params;
  const u = await getUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const r = await getRequest(+id);
  if (!r || r.status !== "approved" || !canView(u, r)) return new Response("Not found", { status: 404 });
  const ap = await q("SELECT a.level, a.decided_at, p.full_name FROM leave_approvals a JOIN users p ON p.id=a.approver_id WHERE request_id=$1 AND decision='approved' ORDER BY decided_at", [r.id]);
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const f = await doc.embedFont(StandardFonts.Helvetica), b = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 780;
  const line = (t, font = f, size = 11, gap = 20) => { page.drawText(String(t), { x: 60, y, size, font }); y -= gap; };
  line("SURAT KETERANGAN CUTI", b, 16, 34);
  line(`Nomor: CUTI/${new Date(r.created_at).getFullYear()}/${String(r.id).padStart(4, "0")}`);
  y -= 10;
  line("Dengan ini dinyatakan bahwa:");
  [["Nama", r.emp_name], ["Jenis cuti", r.type_name], ["Periode", fmtPeriod(r.start_date, r.end_date)],
   ["Total hari", `${r.total_days} hari kerja`], ["Alasan", r.reason], ["Rekan pengganti", r.sub_name || "-"]]
    .forEach(([k, v]) => line(`${k.padEnd(18)}: ${v}`));
  y -= 10;
  line("Telah disetujui melalui alur berikut:", b);
  ap.forEach((a) => line(`- ${a.level === "leader" ? "Ketua Divisi" : "HRD"}: ${a.full_name} (${fmtDate(new Date(a.decided_at).toISOString().slice(0, 10))})`));
  const bytes = await doc.save();
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="surat-cuti-${r.id}.pdf"` } });
}
