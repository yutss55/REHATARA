import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { saveUser, deleteUser, toggleUser } from "@/app/actions/admin";
import { Alert, Badge, Card, Field, Table, Td, Title, inp, btn, btn2, btnR } from "@/components/ui";
import { fmtDate, ROLE } from "@/lib/fmt";

export default async function Users({ searchParams }) {
  await requireUser(["admin"]);
  const sp = await searchParams;

  const order =
    { nama: "u.full_name", baru: "u.join_date DESC", lama: "u.join_date ASC" }[sp.sort] || "u.full_name";

  const rows = await q(
    `SELECT u.*, d.name AS division_name,
       (EXISTS (SELECT 1 FROM leave_requests r WHERE r.user_id = u.id OR r.substitute_id = u.id)
        OR EXISTS (SELECT 1 FROM leave_approvals a WHERE a.approver_id = u.id)) AS has_history
     FROM users u
     LEFT JOIN divisions d ON d.id = u.division_id
     WHERE ($1::text IS NULL OR u.role = $1)
       AND ($2::int IS NULL OR u.division_id = $2)
       AND ($3::boolean IS NULL OR u.is_active = $3)
     ORDER BY ${order}`,
    [sp.role || null, +sp.division || null, sp.active === "1" ? true : sp.active === "0" ? false : null]
  );

  const divs = await q("SELECT id, name FROM divisions ORDER BY name");
  const edit = sp.edit ? await q1("SELECT * FROM users WHERE id = $1", [+sp.edit]) : null;
  const confirmUser = sp.confirm ? await q1("SELECT id, full_name FROM users WHERE id = $1", [+sp.confirm]) : null;
  const delUser = sp.del ? await q1("SELECT id, full_name, username FROM users WHERE id = $1", [+sp.del]) : null;

  const blockers = [];

  if (delUser) {
    const b = await q1(
      `SELECT (SELECT COUNT(*)::int FROM leave_requests WHERE user_id = $1) AS reqs,
              (SELECT COUNT(*)::int FROM leave_requests WHERE substitute_id = $1) AS subs,
              (SELECT COUNT(*)::int FROM leave_approvals WHERE approver_id = $1) AS apps,
              (SELECT COUNT(*)::int FROM divisions WHERE leader_id = $1) AS lead`,
      [delUser.id]
    );

    if (b.lead) blockers.push("masih menjadi ketua sebuah divisi (ganti ketuanya dulu di menu Divisi)");
    if (b.reqs) blockers.push(`memiliki ${b.reqs} pengajuan cuti`);
    if (b.subs) blockers.push(`tercatat sebagai rekan pengganti di ${b.subs} pengajuan`);
    if (b.apps) blockers.push(`pernah memberi keputusan pada ${b.apps} pengajuan`);
  }

  const total = (await q1("SELECT COUNT(*)::int n FROM users")).n;

  return (
    <>
      <Title title="Manajemen Pengguna" sub={`${total} pengguna terdaftar`}>
        <Link href="/users#form" className={btn}>
          Tambah pengguna
        </Link>
      </Title>

      <Alert err={sp.err} ok={sp.ok} />

      {confirmUser && (
        <Card className="mb-5 border-amber-300">
          <h2 id="konfirmasi" className="mb-2 text-lg font-bold">
            Nonaktifkan {confirmUser.full_name}?
          </h2>
          <p className="mb-3 text-sm">
            Pengguna tidak bisa login lagi dan tidak muncul sebagai rekan pengganti. Riwayat cuti tetap tersimpan
            dan akun bisa diaktifkan kembali kapan saja.
          </p>
          <form action={toggleUser} className="space-y-3">
            <input type="hidden" name="id" value={confirmUser.id} />
            <input type="hidden" name="activate" value="0" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="agree" /> Saya paham dampaknya
            </label>
            <div className="flex gap-2">
              <button className={btn}>Nonaktifkan</button>
              <Link href="/users" className={btn2}>
                Batal
              </Link>
            </div>
          </form>
        </Card>
      )}

      {delUser &&
        (blockers.length > 0 ? (
          <Card className="mb-5 border-amber-300">
            <h2 id="konfirmasi" className="mb-2 text-lg font-bold">
              {delUser.full_name} belum bisa dihapus
            </h2>
            <p className="mb-2 text-sm">Akun ini tidak dapat dihapus permanen karena:</p>
            <ul className="mb-3 list-disc pl-5 text-sm">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mb-3 text-sm">
              Menghapusnya akan merusak riwayat cuti. Nonaktifkan saja: akun tidak bisa login, dan riwayat tetap
              tersimpan.
            </p>
            <div className="flex gap-2">
              <Link href={`/users?confirm=${delUser.id}#konfirmasi`} className={btn}>
                Nonaktifkan sebagai gantinya
              </Link>
              <Link href="/users" className={btn2}>
                Tutup
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="mb-5 border-red-300">
            <h2 id="konfirmasi" className="mb-2 text-lg font-bold">
              Hapus permanen {delUser.full_name}?
            </h2>
            <p className="mb-3 text-sm">
              Akun ini belum punya riwayat apa pun, sehingga aman dihapus. Tindakan ini tidak bisa dibatalkan.
            </p>
            <form action={deleteUser} className="space-y-3">
              <input type="hidden" name="id" value={delUser.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="agree" /> Saya paham dampaknya
              </label>
              <Field label={`Ketik username "${delUser.username}" untuk konfirmasi akhir`}>
                <input name="confirm" className={inp} autoComplete="off" />
              </Field>
              <div className="flex gap-2">
                <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">
                  Hapus permanen
                </button>
                <Link href="/users" className={btn2}>
                  Batal
                </Link>
              </div>
            </form>
          </Card>
        ))}

      <Card className="mb-5">
        <form className="mb-4 grid gap-3 sm:grid-cols-5">
          <Field label="Role">
            <select name="role" defaultValue={sp.role || ""} className={inp}>
              <option value="">Semua role</option>
              {Object.entries(ROLE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Divisi">
            <select name="division" defaultValue={sp.division || ""} className={inp}>
              <option value="">Semua divisi</option>
              {divs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status aktif">
            <select name="active" defaultValue={sp.active || ""} className={inp}>
              <option value="">Semua</option>
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </Field>

          <Field label="Urutkan">
            <select name="sort" defaultValue={sp.sort || "nama"} className={inp}>
              <option value="nama">Nama (A sampai Z)</option>
              <option value="baru">Bergabung terbaru</option>
              <option value="lama">Masa kerja terlama</option>
            </select>
          </Field>

          <button className={`${btn2} self-end`}>Terapkan</button>
        </form>

        <Table head={["Nama", "Email", "Role", "Divisi", "Bergabung", "Status", "Aksi"]}>
          {rows.map((u) => (
            <tr key={u.id}>
              <Td>
                <b>{u.full_name}</b>
              </Td>
              <Td>{u.email}</Td>
              <Td>
                <Badge>{ROLE[u.role]}</Badge>
              </Td>
              <Td>{u.division_name || "-"}</Td>
              <Td>{fmtDate(u.join_date)}</Td>
              <Td>
                <Badge c={u.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                  {u.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Link href={`/users?edit=${u.id}#form`} className={btn2}>
                    Edit
                  </Link>

                  {u.is_active ? (
                    <Link href={`/users?confirm=${u.id}#konfirmasi`} className={btn2}>
                      Nonaktifkan
                    </Link>
                  ) : (
                    <form action={toggleUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="activate" value="1" />
                      <button className={btn2}>Aktifkan</button>
                    </form>
                  )}

                  {["employee", "leader"].includes(u.role) && (
                    <Link href={`/users?del=${u.id}#konfirmasi`} className={btnR}>
                      Hapus
                    </Link>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>

        <p className="mt-3 text-xs text-slate-500">
          Admin dan HRD tidak dapat dihapus dari daftar. Hanya Karyawan dan Ketua Divisi.
        </p>
      </Card>

      <Card>
        <h2 id="form" className="mb-4 text-lg font-bold">
          {edit ? `Edit ${edit.full_name}` : "Tambah pengguna"}
        </h2>

        <form action={saveUser} key={edit?.id || "new"} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="id" value={edit?.id || ""} />

          <Field label="Nama lengkap">
            <input name="full_name" defaultValue={edit?.full_name} required className={inp} />
          </Field>

          <Field label="Username">
            <input name="username" defaultValue={edit?.username} required className={inp} />
          </Field>

          <Field label="Email">
            <input name="email" type="email" defaultValue={edit?.email} required className={inp} />
          </Field>

          <Field label={edit ? "Password (kosongkan jika tidak diganti)" : "Password"}>
            <input
              name="password"
              type="password"
              required={!edit}
              className={inp}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Role">
            <select name="role" defaultValue={edit?.role || "employee"} className={inp}>
              {Object.entries(ROLE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Divisi">
            <select name="division_id" defaultValue={edit?.division_id || ""} className={inp}>
              <option value="">Tanpa divisi</option>
              {divs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kuota cuti awal / sisa (hari)">
            <input
              name="leave_quota"
              type="number"
              step="0.5"
              min="0"
              defaultValue={edit?.leave_quota ?? 12}
              required
              className={inp}
            />
          </Field>

          <Field label="Tanggal bergabung">
            <input name="join_date" type="date" defaultValue={edit?.join_date} className={inp} />
          </Field>

          <div className="flex gap-2 sm:col-span-3">
            <button className={btn}>Simpan</button>
            <Link href="/users" className={btn2}>
              Batal
            </Link>
          </div>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Semua field wajib diisi. Email harus valid dan belum dipakai pengguna lain.
        </p>
      </Card>
    </>
  );
}