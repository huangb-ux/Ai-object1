import { NextResponse } from "next/server";
import { z } from "zod";
import { setDevice } from "@/lib/house";
import { DEVICE_IDS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  id: z.enum(DEVICE_IDS),
  on: z.boolean().optional(),
  level: z.number().optional(),
  target: z.number().optional(),
});

/** 面板上的手动开关，直接改设备，不经过语言解析 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "设备参数不对" }, { status: 400 });
  }

  const { id, on, level, target } = parsed.data;
  const state = setDevice(id, { on, level, target });
  return NextResponse.json({ state });
}
