import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { saveUser, deleteUser } from "@/app/actions/admin";
import { Alert, Badge, Card, Field, Table, Td, Title, inp, btn, btn2, btnR } from "@/components/ui";
import { fmtDate, ROLE } from "@/lib/fmt";

export default async function Users({ searchParams }) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const order = { nama: "u.full_name", baru: "u.join_date DESC", lama: "u.join_date ASC" }[sp.sort] || "u.full_name";
  const rows = await q(
    `SELECT u.*, d.name AS division_name FROM users u LEFT JOIN divisions d ON d.id=u.division_id
     WHERE ($1::text IS NULL OR u.role=$1) AND ($2::int IS NULL OR u.division_id=$2)
       AND ($3::boolean IS NULL OR u.is_active=$3) ORDER BY ${order}`,
    [sp.role || null, +sp.division || null, sp.active === "1" ? true : sp.active === "0" ? false : null]);
  const divs = await q("SELECT id, name FROM divisions ORDER BY name");
  const edit = sp.edit ? await q1("SELECT * FROM users WHERE id=$1", [+sp.edit]) : null;
  const total = (await q1("SELECT COUNT(*)::int n FROM users")).n;
  return (
    <>
      <Title title="Manajemen Pengguna" sub={`${total} pengguna terdaftar`}><Link href="/users#form" className={btn}>Tambah pengguna</Link></Title>
      <Alert err={sp.err} ok={sp.ok} />
      <Card className="mb-5">
        <form className="mb-4 grid gap-3 sm:grid-cols-5">
          <Field label="Role"><select name="role" defaultValue={sp.role || ""} className={inp}><option value="">Semua role</option>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Divisi"><select name="division" defaultValue={sp.division || ""} className={inp}><option value="">Semua divisi</option>{divs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Status aktif"><select name="active" defaultValue={sp.active || ""} className={inp}><option value="">Semua</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select></Field>
          <Field label="Urutkan"><select name="sort" defaultValue={sp.sort || "nama"} className={inp}><option value="nama">Nama (A sampai Z)</option><option value="baru">Bergabung terbaru</option><option value="lama">Masa kerja terlama</option></select></Field>
          <button className={`${btn2} self-end`}>Terapkan</button>
        </form>
        <Table head={["Nama", "Email", "Role", "Divisi", "Bergabung", "Status", "Aksi"]}>
          {rows.map((u) => (
            <tr key={u.id}><Td><b>{u.full_name}</b></Td><Td>{u.email}</Td><Td><Badge>{ROLE[u.role]}</Badge></Td>
              <Td>{u.division_name || "-"}</Td><Td>{fmtDate(u.join_date)}</Td>
              <Td><Badge c={u.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{u.is_active ? "Aktif" : "Nonaktif"}</Badge></Td>
              <Td><div className="flex gap-1"><Link href={`/users?edit=${u.id}#form`} className={btn2}>Edit</Link>
                {["employee", "leader"].includes(u.role) && <form action={deleteUser}><input type="hidden" name="id" value={u.id} /><button className={btnR}>Hapus</button></form>}</div></Td></tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-slate-500">Admin dan HRD tidak dapat dihapus dari daftar. Hanya Karyawan dan Ketua Divisi.</p>
      </Card>
      <Card><h2 id="form" className="mb-4 text-lg font-bold">{edit ? `Edit ${edit.full_name}` : "Tambah pengguna"}</h2>
        <form action={saveUser} key={edit?.id || "new"} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="id" value={edit?.id || ""} />
          <Field label="Nama lengkap"><input name="full_name" defaultValue={edit?.full_name} required className={inp} /></Field>
          <Field label="Username"><input name="username" defaultValue={edit?.username} required className={inp} /></Field>
          <Field label="Email"><input name="email" type="email" defaultValue={edit?.email} required className={inp} /></Field>
          <Field label={edit ? "Password (kosongkan jika tidak diganti)" : "Password"}><input name="password" type="password" required={!edit} className={inp} autoComplete="new-password" /></Field>
          <Field label="Role"><select name="role" defaultValue={edit?.role || "employee"} className={inp}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Divisi"><select name="division_id" defaultValue={edit?.division_id || ""} className={inp}><option value="">Tanpa divisi</option>{divs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Kuota cuti awal / sisa (hari)"><input name="leave_quota" type="number" step="0.5" min="0" defaultValue={edit?.leave_quota ?? 12} required className={inp} /></Field>
          <Field label="Tanggal bergabung"><input name="join_date" type="date" defaultValue={edit?.join_date} className={inp} /></Field>
          {edit && <Field label="Status"><select name="is_active" defaultValue={edit.is_active ? "1" : "0"} className={inp}><option value="1">Aktif</option><option value="0">Nonaktif</option></select></Field>}
          <div className="flex gap-2 sm:col-span-3"><button className={btn}>Simpan</button><Link href="/users" className={btn2}>Batal</Link></div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Semua field wajib diisi. Email harus valid dan belum dipakai pengguna lain.</p>
      </Card>
    </>
  );
}
