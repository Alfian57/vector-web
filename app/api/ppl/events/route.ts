import { connection } from "next/server";
import { getAccount } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handle, RequestError } from "@/lib/server/http";

export async function GET(request: Request) {
  await connection();
  return handle(async () => {
    const account = await getAccount(request.headers);
    if (!account) throw new RequestError(401, "Masuk untuk melanjutkan.");
    if (account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat mengakses.");

    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stop = () => {};
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        const start = Date.now();
        let revision: bigint | undefined;
        stop = () => {
          if (closed || cancelled) return;
          closed = true;
          clearTimeout(timer);
          request.signal.removeEventListener("abort", stop);
          controller.close();
        };
        request.signal.addEventListener("abort", stop, { once: true });

        async function tick() {
          try {
            const row = await db().radarState.findUniqueOrThrow({
              where: { onlyRow: true },
              select: { revision: true },
            });
            if (closed || cancelled) return;
            if (revision !== row.revision) {
              revision = row.revision;
              controller.enqueue(encoder.encode(`id: ${revision}\nevent: refresh\ndata: ${revision}\n\n`));
            } else {
              controller.enqueue(encoder.encode(": keepalive\n\n"));
            }
            if (Date.now() - start > 55_000) stop();
            else timer = setTimeout(tick, 3000);
          } catch {
            stop();
          }
        }
        if (request.signal.aborted) stop();
        else void tick();
      },
      cancel() {
        cancelled = true;
        clearTimeout(timer);
        request.signal.removeEventListener("abort", stop);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
