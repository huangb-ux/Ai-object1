import { z } from "zod";
import { DEVICES } from "./devices";
import type { HouseSnapshot, Plan } from "./types";

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 没配 Key 就返回 null，整条链路走本地规则 */
export function getLlmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    baseUrl: (process.env.LLM_BASE_URL?.trim() || "https://api.deepseek.com/v1").replace(/\/+$/, ""),
    apiKey,
    model: process.env.LLM_MODEL?.trim() || "deepseek-chat",
  };
}

const actionSchema = z.object({
  device: z.enum(["light.ceiling", "lamp.floor", "tv", "fan", "ac", "curtain"]),
  on: z.boolean().optional(),
  level: z.number().optional(),
  target: z.number().optional(),
});

const planSchema = z.object({
  actions: z.array(actionSchema).max(8),
  reply: z.string().min(1).max(120),
});

export type LlmPlanPayload = z.infer<typeof planSchema>;

function deviceLine(): string {
  return DEVICES.map((def) => {
    const control =
      def.kind === "light"
        ? "on + level 0-100"
        : def.kind === "fan"
          ? "on + level 1-3（档位）"
          : def.kind === "ac"
            ? "on + target 16-30（摄氏度）"
            : def.kind === "curtain"
              ? "level 0-100（0 为全关）"
              : "on";
    return `- ${def.id}（${def.name}）：${control}`;
  }).join("\n");
}

const SYSTEM_PROMPT = `你是一个智能家居中控的意图解析器。
把用户的中文指令翻译成设备指令 JSON，只输出 JSON，不要 markdown，不要解释。

可用设备：
${deviceLine()}

输出格式：
{"actions":[{"device":"light.ceiling","on":true,"level":60}],"reply":"一句自然的中文回应，不超过 40 字"}

规则：
1. 一条用户指令最多 8 条动作；
2. 场景类指令（回家、睡觉、看电影、专注工作）要输出多条动作，顺序上先窗帘、再灯、最后空调风扇；
3. 空调给温度就代表开空调；
4. 不确定或超出设备范围时，actions 输出空数组，reply 说明没听懂。`;

/** 用大模型解析指令。失败就返回 null，由调用方降级到本地规则。 */
export async function planWithLlm(raw: string, state: HouseSnapshot, cfg: LlmConfig): Promise<Plan | null> {
  const deviceState = state.devices
    .map((d) => `${d.id}: on=${d.on} level=${d.level} target=${d.target}`)
    .join("\n");

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `当前设备状态：\n${deviceState}\n\n用户说：${raw}` },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error("[zhangdeng] llm http", res.status);
      return null;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = planSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) {
      console.error("[zhangdeng] llm schema", parsed.error.issues[0]?.message);
      return null;
    }

    return { actions: parsed.data.actions, reply: parsed.data.reply, engine: "llm" };
  } catch (error) {
    console.error("[zhangdeng] llm failed", error instanceof Error ? error.message : error);
    return null;
  }
}
