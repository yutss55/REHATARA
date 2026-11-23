"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function updateProfile(fd) {
  const u = await requireUser();
  const g = (k) => String(fd.get(k) || "").trim();
  const bad = (m) => redirect("/profile?err=" + encodeURIComponent(m));
  if (!g("full_name") || !g("username")) bad("Nama dan username wajib diisi.");
  if (!/^\S+@\S+\.\S+$/.test(g("email"))) bad("Email tidak valid.");
  if (g("password") && g("password").length < 8) bad("Password baru minimal 8 karakter.");
  try {
    await q("UPDATE users SET full_name=$1, username=$2, email=$3, phone=$4, address=$5 WHERE id=$6",
      [g("full_name"), g("username"), g("email").toLowerCase(), g("phone"), g("address"), u.id]);
    if (g("password")) await q("UPDATE users SET password_hash=$1 WHERE id=$2", [await bcrypt.hash(g("password"), 10), u.id]);
  } catch (e) { bad(e.code === "23505" ? "Username atau email sudah dipakai." : "Gagal menyimpan."); }
  redirect("/profile?ok=" + encodeURIComponent("Profil disimpan."));
}
