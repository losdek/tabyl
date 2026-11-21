import { readPhotoFile } from "@/server/photos";

export async function GET(_req: Request, ctx: RouteContext<"/media/p/[id]/[file]">) {
  const { id, file } = await ctx.params;
  const buf = await readPhotoFile(id, file);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": file.endsWith(".avif") ? "image/avif" : "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
