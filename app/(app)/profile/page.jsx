import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { updateProfile, updatePhoto, removePhoto } from "@/app/actions/profile";
import { Alert, Badge, Card, Field, Title, inp, btn, btn2 } from "@/components/ui";
import Avatar from "@/components/Avatar";
import PhotoButton from "@/components/PhotoButton";
import { ROLE, fmtNum } from "@/lib/fmt";

export default async function Profile({ searchParams }) {
  const u = await requireUser();
  const sp = await searchParams;
  const hasQuota = ["employee", "leader"].includes(u.role);

  let pending = 0, used = 0;
  if (hasQuota) {
    pending = (await q1(
      `SELECT COALESCE(SUM(r.total_days),0) AS n FROM leave_requests r
       JOIN leave_types t ON t.id=r.leave_type_id
       WHERE r.user_id=$1 AND r.status IN ('pending','approved_leader') AND t.deducts_annual_quota`, [u.id])).n;
    used = Math.max(0, 12 - u.leave_quota - pending);
  }
  const disabled = `${inp} bg-slate-100 text-slate-500`;

  return (
    <>
      <Title title="Profil" sub="Karyawan mengubah data sendiri. Admin dapat mengubah semua data." />
      <div className={`grid gap-5 ${hasQuota ? "lg:grid-cols-[1fr_340px]" : "max-w-3xl"}`}>
        <Card>
          <Alert err={sp?.err} ok={sp?.ok} />
          <div className="mb-5 flex items-center gap-5">
            <Avatar user={u} size={104} />
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold">{u.full_name}</h2>
              <Badge>{ROLE[u.role]}</Badge>
              <div className="flex items-center gap-3 pt-1">
                <PhotoButton action={updatePhoto} className={btn2} />
                {u.photo && (
                  <form action={removePhoto}>
                    <button className="text-xs text-slate-500 underline">Hapus foto</button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <form action={updateProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap"><input name="full_name" defaultValue={u.full_name} required className={inp} /></Field>
            <Field label="Username"><input name="username" defaultValue={u.username} required className={inp} /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={u.email} required className={inp} /></Field>
            <Field label="Telepon"><input name="phone" defaultValue={u.phone || ""} className={inp} /></Field>
            <Field label="Alamat" className="sm:col-span-2"><input name="address" defaultValue={u.address || ""} className={inp} /></Field>
            <Field label="Role"><input value={ROLE[u.role]} disabled className={disabled} /></Field>
            <Field label="Divisi"><input value={u.division_name || "-"} disabled className={disabled} /></Field>
            <details className="sm:col-span-2 text-sm">
              <summary className="cursor-pointer text-slate-600">Ganti password (opsional)</summary>
              <div className="mt-2 max-w-sm">
                <Field label="Password baru (minimal 8 karakter)">
                  <input name="password" type="password" className={inp} autoComplete="new-password" />
                </Field>
              </div>
            </details>
            <div className="flex gap-2 sm:col-span-2">
              <button className={btn}>Simpan perubahan</button>
              <Link href="/profile" className={btn2}>Batal</Link>
            </div>
          </form>
        </Card>

        {hasQuota && (
          <Card className="h-fit">
            <h2 className="text-lg font-bold">Kuota cuti tahunan {new Date().getFullYear()}</h2>
            <p className="my-2 font-display text-5xl font-bold">
              {fmtNum(u.leave_quota)} <span className="text-base font-normal text-slate-500">hari tersisa</span>
            </p>
            <div className="mb-4 h-2.5 rounded-full bg-slate-200">
              <div className="h-2.5 rounded-full bg-teal-700" style={{ width: `${Math.min(100, (u.leave_quota / 12) * 100)}%` }} />
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Kuota tahunan</dt><dd className="font-bold">12 hari</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Terpakai</dt><dd className="font-bold">{fmtNum(used)} hari</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Sisa</dt><dd className="font-bold">{fmtNum(u.leave_quota)} hari</dd></div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              Terpakai {fmtNum(used)} ditambah {fmtNum(pending)} yang sedang menunggu persetujuan. Kuota diperbarui otomatis setiap ada pengajuan, penolakan, atau pembatalan.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}