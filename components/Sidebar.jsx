
"use client";

import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ROLE } from "@/lib/fmt";
import Logo from "@/components/Logo";
import { usePathname } from "next/navigation";

const NAV = {
  admin: [
    ["/dashboard", "Dashboard"],
    ["/users", "Pengguna"],
    ["/divisions", "Divisi"],
    ["/leave-types", "Jenis Cuti"],
    ["/holidays", "Hari Libur"],
  ],
  employee: [
    ["/dashboard", "Dashboard"],
    ["/leaves", "Pengajuan Cuti"],
    ["/history", "Riwayat"],
    ["/profile", "Profil"],
  ],
  leader: [
    ["/dashboard", "Dashboard"],
    ["/approvals", "Verifikasi"],
    ["/leaves", "Cuti Saya"],
    ["/history", "Riwayat"],
    ["/profile", "Profil"],
  ],
  hrd: [
    ["/dashboard", "Dashboard"],
    ["/approvals", "Persetujuan Final"],
    ["/history", "Semua Pengajuan"],
    ["/profile", "Profil"],
  ],
};

export default function Sidebar({ user }) {
  const pathname = usePathname();

  const menus = NAV[user.role] || [];

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-[#0f2a33] p-4 text-slate-200">

      <div className="mb-6">
        <Logo size={32} />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {menus.map(([href, label]) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm transition-all duration-300 ease-in-out ${
                isActive
                  ? "bg-[#294650] text-white font-semibold shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 pt-3 text-sm">
        <p className="font-semibold text-white">
          {user.full_name}
        </p>

        <p className="text-slate-400">
          {ROLE[user.role]}
        </p>

        <form action={logout}>
          <button className="mt-2 text-xs text-teal-300 underline">
            Keluar
          </button>
        </form>
      </div>

    </aside>
  );
}
