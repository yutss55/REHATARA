import fs from "fs/promises";
import path from "path";
import { getUser } from "@/lib/auth";

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_, { params }) {
  const { name: raw } = await params;
  const name = path.basename(raw);
  if (!(await getUser())) return new Response("Unauthorized", { status: 401 });
  const buf = await fs.readFile(path.join("uploads", "photos", name)).catch(() => null);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(buf, {
    headers: {
      "Content-Type": MIME[path.extname(name).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
    },
  });
}