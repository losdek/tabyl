import { getDb } from "@/db/client";
import { PhotoError, saveUpload } from "@/server/photos";
import { currentUser } from "@/server/session";

/** One photo per request (the client uploads in parallel with progress). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы загружать фото" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Нет файла" }, { status: 400 });
  try {
    const p = await saveUpload(await getDb(), user.id, Buffer.from(await file.arrayBuffer()));
    return Response.json({ id: p.id, width: p.width, height: p.height, blur: p.blur });
  } catch (e) {
    if (e instanceof PhotoError) return Response.json({ error: e.message }, { status: 422 });
    console.error(e);
    return Response.json({ error: "Не удалось обработать фото" }, { status: 500 });
  }
}
