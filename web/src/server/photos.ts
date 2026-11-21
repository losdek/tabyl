import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata, type Sharp } from "sharp";
import { and, isNull, lt } from "drizzle-orm";
import type { DB } from "@/db/client";
import { adPhotos } from "@/db/schema";
import { shortId } from "@/lib/ids";

export const PHOTO_WIDTHS = [320, 640, 1280] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const storageRoot = () => process.env.TABYL_STORAGE_DIR ?? path.join(process.cwd(), "storage");
const photoDir = (id: string) => path.join(storageRoot(), "photos", id.slice(0, 2), id);

export class PhotoError extends Error {}

/** 64-bit difference hash: near-identical photos get near-identical hashes. */
async function dHash(img: Sharp): Promise<string> {
  const { data } = await img.clone().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) bits = (bits << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n);
  return bits.toString(16).padStart(16, "0");
}

/**
 * Store one uploaded photo: auto-rotate by EXIF, strip all metadata (location!),
 * write AVIF + WebP at three widths and a blurred 16 px placeholder.
 */
export async function saveUpload(db: DB, userId: string, input: Buffer) {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new PhotoError("Фото больше 15 МБ");
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new PhotoError("Это не похоже на фото");
  }
  if (!meta.format || !["jpeg", "png", "webp", "heif", "avif", "gif", "tiff"].includes(meta.format))
    throw new PhotoError("Поддерживаются JPEG, PNG, WebP и HEIC");
  const base = sharp(input, { failOn: "none" }).rotate();
  const { width = 0, height = 0 } = await base.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  if (width < 200 || height < 200) throw new PhotoError("Фото слишком маленькое");

  const id = shortId(14);
  const dir = photoDir(id);
  await mkdir(dir, { recursive: true });
  await Promise.all(
    PHOTO_WIDTHS.flatMap((w) => {
      const r = base.clone().resize({ width: w, withoutEnlargement: true });
      return [
        r.clone().webp({ quality: 74 }).toFile(path.join(dir, `${w}.webp`)),
        r.clone().avif({ quality: 52, effort: 2 }).toFile(path.join(dir, `${w}.avif`)),
      ];
    }),
  );
  const tiny = await base.clone().resize(16).webp({ quality: 40 }).toBuffer();
  const [row] = await db
    .insert(adPhotos)
    .values({
      id,
      userId,
      width,
      height,
      blur: `data:image/webp;base64,${tiny.toString("base64")}`,
      phash: await dHash(base),
    })
    .returning();
  return row;
}

export async function readPhotoFile(id: string, file: string): Promise<Buffer | null> {
  if (!/^[a-z0-9]{14}$/.test(id) || !/^(320|640|1280)\.(webp|avif)$/.test(file)) return null;
  try {
    return await readFile(path.join(photoDir(id), file));
  } catch {
    return null;
  }
}

/** Forget photos uploaded but never attached to an ad within a day. */
export async function sweepOrphans(db: DB, now = new Date()) {
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const rows = await db
    .delete(adPhotos)
    .where(and(isNull(adPhotos.adId), lt(adPhotos.createdAt, dayAgo)))
    .returning({ id: adPhotos.id });
  return rows.length;
}

