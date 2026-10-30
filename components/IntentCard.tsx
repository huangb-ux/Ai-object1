"use client";

import type { DeviceId, HouseSnapshot } from "@/lib/types";
import { DEVICE_MAP } from "@/lib/devices";

interface IntentCardProps {
  state: HouseSnapshot | null;
  result: { reply: string; actions: unknown[]; engine: "local" | "llm" } | null;
}

export default function IntentCard({ state, result }: IntentCardProps) {
  const actions = result?.actions ?? [];

  return (
    <section className="panel intent">
      <header className="panel-head">
        <h2 className="panel-title">01 / 解析</h2>
        <span className="panel-note">INTENT</span>
      </header>

      {!result ? (
        <p className="intent-empty">
          说一句话，这里会出现它对这句话的理解：先给出回应，再把回应拆成一条条设备指令——右边的屋子就是照这份指令动的。
        </p>
      ) : (
        <>
          <p className="intent-reply">「{result.reply}」</p>
          <div className="intent-meta">
            <span className={result.engine === "llm" ? "engine-badge llm" : "engine-badge"}>
              {result.engine === "llm" ? "大模型解析" : "本地规则"}
            </span>
            <span className="panel-note">{actions.length} 条指令</span>
          </div>

          {actions.length > 0 ? (
            <ul className="actions">
              {actions.map((raw, index) => {
                const action = raw as { device: DeviceId; on?: boolean; level?: number; target?: number };
                const def = DEVICE_MAP.get(action.device);
                const params: string[] = [];
                if (action.on !== undefined) params.push(`on=${action.on}`);
                if (action.level !== undefined) params.push(`level=${action.level}`);
                if (action.target !== undefined) params.push(`target=${action.target}`);
                return (
                  <li key={`${action.device}-${index}`} className="action-row">
                    <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="action-dev">{def ? def.name : action.device}</span>
                    <span className="action-param">{params.join(" ") || "toggle"}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="intent-empty">这句话没有匹配到任何设备，屋子保持原样。</p>
          )}

          <pre className="json">{JSON.stringify(actions, null, 2)}</pre>
        </>
      )}

      {state && (
        <p className="intent-foot">
          当前 {state.watts} W · 模拟时钟 {String(Math.floor(state.clock / 60)).padStart(2, "0")}:
          {String(state.clock % 60).padStart(2, "0")}
        </p>
      )}
    </section>
  );
}
