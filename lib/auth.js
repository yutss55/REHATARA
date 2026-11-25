import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { q1 } from "./db";

const SECRET = process.env.AUTH_SECRET;
const sign = (v) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function createSession(id, role, remember) {
  const v = `${id}.${role}.${Date.now()}`;
  (await cookies()).set("sid", `${v}.${sign(v)}`, {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}
export async function destroySession() { (await cookies()).delete("sid"); }

export async function getUser() {
  const c = (await cookies()).get("sid")?.value;
  if (!c) return null;
  const parts = c.split(".");
  if (parts.length !== 4) return null;
  const [id, role, ts, sig] = parts;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(Number(ts)) || age < 0 || age >= 30 * 24 * 60 * 60 * 1000) {
  return null;}
  if (!same(sig, sign(`${id}.${role}.${ts}`))) return null;
  return q1(
    `SELECT u.*, d.name AS division_name FROM users u
     LEFT JOIN divisions d ON d.id = u.division_id WHERE u.id = $1 AND u.is_active`, [id]);
}
export async function requireUser(roles) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect("/dashboard");
  return u;
}