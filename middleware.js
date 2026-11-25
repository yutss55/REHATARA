import { NextResponse } from "next/server";

const SECRET = process.env.AUTH_SECRET;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const enc = new TextEncoder();

async function verify(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, role, ts, sig] = parts;
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${role}.${ts}`));
  const hex = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  if (!(Date.now() - Number(ts) < MAX_AGE_MS)) return null;
  return { id, role };
}

const startsWith = (p, base) => p === base || p.startsWith(base + "/");
const RULES = [
  { test: (p) => ["/users", "/divisions", "/leave-types", "/holidays"].some((b) => startsWith(p, b)), roles: ["admin"] },
  { test: (p) => startsWith(p, "/approvals"), roles: ["leader", "hrd"] },
  { test: (p) => p === "/leaves" || p === "/leaves/new", roles: ["employee", "leader"] },
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const session = await verify(req.cookies.get("sid")?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.redirect(new URL("/login", req.url));
    if (req.cookies.get("sid")) res.cookies.delete("sid");
    return res;
  }
  for (const r of RULES)
    if (r.test(pathname) && !r.roles.includes(session.role))
      return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};