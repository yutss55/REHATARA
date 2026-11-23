import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { q1 } from "./db";

const SECRET = process.env.AUTH_SECRET || "dev-secret-ganti-di-production";
const sign = (v) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");

export async function createSession(id, remember) {
  const v = `${id}.${Date.now()}`;
  (await cookies()).set("sid", `${v}.${sign(v)}`, {
    httpOnly: true, sameSite: "lax", path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}
export async function destroySession() { (await cookies()).delete("sid"); }

export async function getUser() {
  const c = (await cookies()).get("sid")?.value;
  if (!c) return null;
  const [id, ts, sig] = c.split(".");
  if (!sig || sig !== sign(`${id}.${ts}`)) return null;
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
