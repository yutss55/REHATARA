import fs from "fs/promises";
import path from "path";
import { getUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { canView } from "@/lib/leave";

const MIME = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
export async function GET(_, { params }) {
  const { name: raw } = await params;
  const name = path.basename(raw);
  const u = await getUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const r = await q1(`SELECT r.user_id, e.division_id AS edv FROM leave_requests r JOIN users e ON e.id=r.user_id WHERE r.attachment_path=$1`, [name]);
  if (!r || !canView(u, r)) return new Response("Not found", { status: 404 });
  const buf = await fs.readFile(path.join("uploads", name)).catch(() => null);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(buf, { headers: { "Content-Type": MIME[path.extname(name)] || "application/octet-stream" } });
}
