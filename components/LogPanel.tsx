"use client";

import { DEVICE_MAP } from "@/lib/devices";
import type { CommandRecord } from "@/lib/types";

interface LogPanelProps {
  history: CommandRecord[];
}

function timeOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour12: false }).slice(0, 5);
}

export default function LogPanel({ history }: LogPanelProps) {
  return (
    <section className="panel log">
      <header className="panel-head">
        <h2 className="panel-title">04 / 指令历史</h2>
        <span className="panel-note">{history.length} 条</span>
      </header>

      {history.length === 0 ? (
        <p className="intent-empty">还没有指令。说一句试试，成功的指令会存在 SQLite 里。</p>
      ) : (
        <ul className="log-list">
          {history.map((item) => (
            <li key={item.id} className="log-item">
              <span className="log-time">{timeOf(item.createdAt)}</span>
              <div className="log-body">
                <p className="log-text">{item.text}</p>
                <p className="log-reply">
                  {item.actions
                    .map((action) => DEVICE_MAP.get(action.device)?.name ?? action.device)
                    .join(" · ")}
                  {item.reply ? ` — ${item.reply}` : ""}
                </p>
              </div>
              <span className={item.engine === "llm" ? "log-engine llm" : "log-engine"}>
                {item.engine === "llm" ? "LLM" : "本地"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
