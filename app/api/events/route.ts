import { snapshot, subscribe } from "@/lib/house";
import type { ServerEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 一条 SSE 长连接：
 * - 连上先发一份 snapshot
 * - 之后每次设备变化推一条 state，每秒推一条 tick（时钟、用电）
 * 前端不轮询，只认这三种事件。
 */
export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ServerEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // 客户端断开后，controller 会抛错，忽略即可
        }
      };

      send({ type: "snapshot", state: snapshot() });
      unsubscribe = subscribe(send);

      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // 同上
        }
      }, 15_000);
      (ping as unknown as { unref?: () => void }).unref?.();
    },
    cancel() {
      unsubscribe?.();
      if (ping) clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
