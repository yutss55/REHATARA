import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { Card, Status, Title, btn } from "@/components/ui";
import { fmtPeriod, fmtNum } from "@/lib/fmt";

const Stat = ({ n, l, bar }) => (
  <Card><p className="font-display text-3xl font-bold">{n}</p><p className="text-sm text-slate-500">{l}</p>
    {bar != null && <div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-teal-700" style={{ width: `${bar}%` }} /></div>}</Card>
);
const count = async (sql, p = []) => (await q1(sql, p)).n;

export default async function Dashboard() {
  const u = await requireUser();
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  let stats = [], recent = [];
  if (u.role === "admin") {
    stats = [[await count("SELECT COUNT(*)::int n FROM users"), "Pengguna terdaftar"], [await count("SELECT COUNT(*)::int n FROM divisions"), "Divisi"],
      [await count("SELECT COUNT(*)::int n FROM leave_types WHERE is_active"), "Jenis cuti aktif"], [await count("SELECT COUNT(*)::int n FROM leave_requests"), "Total pengajuan"]];
  } else if (u.role === "hrd") {
    stats = [[await count("SELECT COUNT(*)::int n FROM leave_requests r JOIN users e ON e.id=r.user_id WHERE r.status='approved_leader' OR (r.status='pending' AND e.role='leader')"), "Menunggu persetujuan final"],
      [await count("SELECT COUNT(*)::int n FROM leave_requests WHERE status='approved' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE"), "Sedang cuti hari ini"],
      [await count("SELECT COUNT(*)::int n FROM leave_requests"), "Total pengajuan"]];
  } else {
    stats = [[fmtNum(u.leave_quota), "Sisa kuota cuti tahunan (hari)", (u.leave_quota / 12) * 100],
      [await count("SELECT COUNT(*)::int n FROM leave_requests r JOIN leave_types t ON t.id=r.leave_type_id WHERE r.user_id=$1 AND t.name='Cuti Sakit'", [u.id]), "Cuti sakit diajukan"],
      [await count("SELECT COUNT(*)::int n FROM leave_requests WHERE user_id=$1", [u.id]), "Total pengajuan cuti"]];
    if (u.role === "leader") stats.push([await count("SELECT COUNT(*)::int n FROM leave_requests r JOIN users e ON e.id=r.user_id WHERE r.status='pending' AND e.role='employee' AND e.division_id=$1", [u.division_id]), "Menunggu verifikasi Anda"]);
    recent = await q("SELECT r.*, t.name AS type_name FROM leave_requests r JOIN leave_types t ON t.id=r.leave_type_id WHERE r.user_id=$1 ORDER BY r.created_at DESC LIMIT 3", [u.id]);
  }
  return (
    <>
      <Title title={`Dashboard ${{ admin: "Admin", hrd: "HRD", leader: "Ketua Divisi", employee: "Karyawan" }[u.role]}`} sub={today} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([n, l, bar]) => <Stat key={l} n={n} l={l} bar={bar} />)}
        {u.division_name && <Card><p className="font-display text-xl font-bold">{u.division_name}</p></Card>}
      </div>
      {recent.length > 0 && (
        <Card className="mt-5"><h2 className="mb-3 text-lg font-bold">Pengajuan terbaru</h2>
          <ul className="divide-y">{recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2"><Link href={`/leaves/${r.id}`}><b>{r.type_name}, {fmtPeriod(r.start_date, r.end_date)}</b><br /><span className="text-sm text-slate-500">{fmtNum(r.total_days)} hari</span></Link><Status s={r.status} /></li>))}
          </ul></Card>
      )}
      {["employee", "leader"].includes(u.role) && <Link href="/leaves/new" className={`${btn} mt-5 inline-block`}>Ajukan cuti</Link>}
    </>
  );
}
