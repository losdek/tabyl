import { getDb } from "@/db/client";
import { bus, conversationFor } from "@/server/chat";
import { currentUser } from "@/server/session";

/** Server-Sent Events for one conversation: new messages and read receipts. */
export async function GET(req: Request, ctx: RouteContext<"/api/chat/[id]/stream">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user || !(await conversationFor(await getDb(), id, user.id))) return new Response("Forbidden", { status: 403 });

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      const on = (e: unknown) => send(e);
      bus.on(`conv:${id}`, on);
      const ping = setInterval(() => controller.enqueue(enc.encode(": ping\n\n")), 25_000);
      cleanup = () => {
        clearInterval(ping);
        bus.off(`conv:${id}`, on);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
      send({ type: "hello" });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
