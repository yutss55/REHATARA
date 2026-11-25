"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { q1 } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export async function login(fd) {
  const id = String(fd.get("id") || "").trim().toLowerCase();
  const pw = String(fd.get("password") || "");
  const u = id && pw && await q1(
    "SELECT id, role, password_hash FROM users WHERE (lower(email)=$1 OR lower(username)=$1) AND is_active", [id]);
  if (!u || !(await bcrypt.compare(pw, u.password_hash)))
    redirect("/login?err=" + encodeURIComponent("Email/username atau password salah."));
  await createSession(u.id, u.role, fd.get("remember") === "on");
  redirect("/dashboard");
}
export async function logout() { await destroySession(); redirect("/login"); }