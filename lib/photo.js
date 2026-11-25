import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const DIR = path.join("uploads", "photos");

export async function savePhoto(file) {
  const ext = path.extname(file.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) throw new Error("Foto harus JPG, PNG, atau WebP.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Ukuran foto maksimal 2 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ok = (buf[0] === 0xff && buf[1] === 0xd8) ||
             buf.subarray(1, 4).toString() === "PNG" ||
             (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP");
  if (!ok) throw new Error("File bukan gambar yang valid.");
  await fs.mkdir(DIR, { recursive: true });
  const name = crypto.randomUUID() + ext;
  await fs.writeFile(path.join(DIR, name), buf);
  return name;
}

export const deletePhoto = (name) =>
  name ? fs.unlink(path.join(DIR, path.basename(name))).catch(() => {}) : null;