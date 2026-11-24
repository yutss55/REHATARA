import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { saveDivision, deleteDivision, addMember, removeMember } from "@/app/actions/admin";
import { Alert, Badge, Card, Field, Table, Td, Title, inp, btn, btn2, btnR } from "@/components/ui";
import { fmtDate } from "@/lib/fmt";

export default async function Divisions({ searchParams }) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const rows = await q(`SELECT d.*, l.full_name AS leader_name, (SELECT COUNT(*)::int FROM users u WHERE u.division_id=d.id) AS members
                        FROM divisions d LEFT JOIN users l ON l.id=d.leader_id
                        WHERE ($1::text IS NULL OR d.name ILIKE '%'||$1||'%') ORDER BY d.name`, [sp.search || null]);
  const selId = +sp.sel || rows[0]?.id;
  const sel = rows.find((r) => r.id === selId);
  const members = sel ? await q("SELECT id, full_name, role, is_active FROM users WHERE division_id=$1 ORDER BY role='leader' DESC, full_name", [sel.id]) : [];
  const free = await q("SELECT id, full_name FROM users WHERE role='employee' AND is_active AND (division_id IS NULL OR division_id<>$1) ORDER BY full_name", [sel?.id || 0]);
  const edit = sp.edit ? rows.find((r) => r.id === +sp.edit) : null;
  const del = sp.del ? rows.find((r) => r.id === +sp.del) : null;
  const total = (await q1("SELECT COUNT(*)::int n FROM users")).n;
  const candidates = await q(`SELECT u.id, u.full_name FROM users u WHERE u.is_active AND u.role IN ('employee','leader')
     AND NOT EXISTS (SELECT 1 FROM divisions d WHERE d.leader_id=u.id AND d.id IS DISTINCT FROM $1) ORDER BY u.full_name`, [edit?.id || 0]);
  return (
    <>
      <Title title="Manajemen Divisi" sub={`${rows.length} divisi, ${total} pengguna`}><Link href="/divisions#form" className={btn}>Tambah divisi</Link></Title>
      <Alert err={sp.err} ok={sp.ok} />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card>
          <form className="mb-4 flex items-end gap-3"><Field label="Nama divisi"><input name="search" defaultValue={sp.search} placeholder="Cari divisi" className={inp} /></Field><button className={btn2}>Cari</button></form>
          <Table head={["Divisi", "Ketua", "Anggota", "Dibentuk", "Aksi"]}>
            {rows.map((d) => (
              <tr key={d.id} className={d.id === selId ? "bg-teal-50" : ""}>
                <Td><Link href={`/divisions?sel=${d.id}`} className="font-bold">{d.name}</Link></Td><Td>{d.leader_name || "-"}</Td><Td>{d.members}</Td><Td>{fmtDate(d.created_at)}</Td>
                <Td><div className="flex gap-1"><Link href={`/divisions?edit=${d.id}#form`} className={btn2}>Edit</Link><Link href={`/divisions?del=${d.id}#hapus`} className={btnR}>Hapus</Link></div></Td>
              </tr>))}
          </Table>
        </Card>
        {sel && (
          <Card className="h-fit"><h2 className="text-lg font-bold">{sel.name}</h2><p className="mb-3 text-sm text-slate-500">Ketua: {sel.leader_name || "-"}, {sel.members} anggota</p>
            <form action={addMember} className="mb-3 flex gap-2"><input type="hidden" name="division_id" value={sel.id} />
              <select name="user_id" className={inp}><option value="">Tambah anggota…</option>{free.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select><button className={btn2}>Tambah</button></form>
            <ul className="divide-y text-sm">{members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2"><span><b>{m.full_name}</b><br /><span className="text-slate-500">{m.role === "leader" ? "Ketua Divisi" : "Karyawan"}</span></span>
                <span className="flex items-center gap-2"><Badge c={m.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{m.is_active ? "Aktif" : "Nonaktif"}</Badge>
                  {m.role === "employee" && <form action={removeMember}><input type="hidden" name="division_id" value={sel.id} /><input type="hidden" name="user_id" value={m.id} /><button className={btn2}>Keluarkan</button></form>}</span></li>))}</ul>
            <p className="mt-3 text-xs text-slate-500">Mengeluarkan anggota tidak menghapus akunnya.</p></Card>)}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card><h2 id="form" className="mb-3 text-lg font-bold">{edit ? `Edit ${edit.name}` : "Tambah divisi"}</h2>
          <form action={saveDivision} key={edit?.id || "new"} className="space-y-3"><input type="hidden" name="id" value={edit?.id || ""} />
            <Field label="Nama divisi"><input name="name" defaultValue={edit?.name} required className={inp} /></Field>
            <Field label="Deskripsi (opsional)"><input name="description" defaultValue={edit?.description || ""} className={inp} /></Field>
            <Field label="Ketua divisi"><select name="leader_id" defaultValue={edit?.leader_id || ""} className={inp}><option value="">Pilih ketua (belum memimpin divisi lain)</option>{candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></Field>
            <p className="text-xs text-slate-500">Tanggal dibentuk terisi otomatis. Nama divisi harus unik dan satu orang hanya memimpin satu divisi.</p>
            <div className="flex gap-2"><button className={btn}>Simpan</button><Link href="/divisions" className={btn2}>Batal</Link></div></form></Card>
        {del && (
          <Card className="border-red-200"><h2 id="hapus" className="mb-2 text-lg font-bold">Hapus divisi {del.name}?</h2>
            <p className="mb-3 text-sm">{del.members} anggota akan kehilangan atribut divisinya. Akun mereka tetap ada. Tindakan ini perlu dikonfirmasi dua kali.</p>
            <form action={deleteDivision} className="space-y-3"><input type="hidden" name="id" value={del.id} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="agree" /> Saya paham dampaknya</label>
              <Field label="Ketik nama divisi untuk konfirmasi akhir"><input name="confirm" className={inp} autoComplete="off" /></Field>
              <div className="flex gap-2"><button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Hapus divisi</button><Link href="/divisions" className={btn2}>Batal</Link></div></form></Card>)}
      </div>
    </>
  );
}
