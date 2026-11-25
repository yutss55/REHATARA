"use client";

import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ROLE } from "@/lib/fmt";
import Logo from "@/components/Logo";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";

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

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
}

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

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2.5">
          <Avatar user={user} size={36} />
          <div className="min-w-0 text-xs">
            <p className="truncate font-semibold text-white">{user.full_name}</p>
            <p className="text-slate-400">{ROLE[user.role]}</p>
          </div>
        </div>

        <form action={logout} className="mt-2.5">
          <button className="rounded-md bg-[#294650] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15">
            Keluar
          </button>
        </form>
      </div>

    </aside>
  );
}