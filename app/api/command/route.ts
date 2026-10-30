import { NextResponse } from "next/server";
import { z } from "zod";
import { newCommandId, saveCommand } from "@/lib/db";
import { applyActions, snapshot } from "@/lib/house";
import { parseIntent } from "@/lib/intent";
import { getLlmConfig, planWithLlm } from "@/lib/llm";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(120),
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "说一句话吧，最多 120 字" }, { status: 400 });
  }

  const text = parsed.data.text;
  const current = snapshot();

  // 有大模型就先用它，失败（超时/限流/JSON 不合法）自动落回本地规则
  let plan: Plan | null = null;
  const cfg = getLlmConfig();
  if (cfg) plan = await planWithLlm(text, current, cfg);
  if (!plan) plan = parseIntent(text, current);

  // 一条一条落地：前端看到的是窗帘先动、灯再亮，而不是整屏同时跳变
  for (const action of plan.actions) {
    applyActions([action]);
    await sleep(120);
  }

  const id = newCommandId();
  const saved =
    plan.actions.length > 0
      ? saveCommand({ id, text, reply: plan.reply, engine: plan.engine, actions: plan.actions })
      : false;

  return NextResponse.json({
    id,
    reply: plan.reply,
    actions: plan.actions,
    engine: plan.engine,
    saved,
    state: snapshot(),
  });
}
