import { login } from "@/app/actions/auth";
import { Alert, Field, inp, btn } from "@/components/ui";
import Logo from "@/components/Logo";

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      
<div className="flex flex-col justify-between bg-[#0f2a33] p-10 text-white">
  <Logo size={48} />

  <div>
    <h1 className="font-display text-4xl font-bold leading-tight">
      Selamat Datang di REHATARA!
    </h1>
    <p className="mt-4 max-w-md text-slate-300">
      Kelola waktu istirahat dan pengajuan cuti Anda dengan lebih mudah
      dan terarah. Kami hadir untuk membantu menciptakan proses
      administrasi cuti yang praktis, transparan, dan terorganisasi.
    </p>
  </div>

  <div className="flex flex-wrap gap-2 text-xs">
    {["Admin", "Karyawan", "Ketua Divisi", "HRD"].map((r) => (
      <span key={r} className="rounded-full bg-white/10 px-3 py-1">
        {r}
      </span>
    ))}
  </div>
</div>

      <div className="grid place-items-center p-6">
        <form action={login} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-8">
          <div><h2 className="text-2xl font-bold">Masuk</h2><p className="text-sm text-slate-500">Peran Anda terdeteksi otomatis setelah login.</p></div>
          <Alert err={sp?.err} />
          <Field label="Email atau username"><input name="id" required className={inp} autoComplete="username" /></Field>
          <Field label="Password"><input name="password" type="password" required className={inp} autoComplete="current-password" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remember" defaultChecked /> Remember me</label>
          <button className={`${btn} w-full`}>Masuk</button>
          <p className="text-xs text-slate-500">Akun dibuat oleh Admin. Lupa password? Hubungi Admin atau HRD.</p>
        </form>
      </div>
    </div>
  );
}
