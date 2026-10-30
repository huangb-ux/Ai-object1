"use client";

import { useCallback, useEffect, useState } from "react";
import CommandBar from "@/components/CommandBar";
import DevicePanel from "@/components/DevicePanel";
import EnergyPanel from "@/components/EnergyPanel";
import IntentCard from "@/components/IntentCard";
import LogPanel from "@/components/LogPanel";
import RoomView from "@/components/RoomView";
import SceneBar from "@/components/SceneBar";
import type { Action, CommandRecord, DeviceId, HouseSnapshot, PlanEngine, ServerEvent } from "@/lib/types";

interface PlanView {
  reply: string;
  actions: Action[];
  engine: PlanEngine;
}

const EXAMPLES = ["我回家了", "把主灯调到 60%", "有点冷", "看电影", "全关"];

export default function Home() {
  const [state, setState] = useState<HouseSnapshot | null>(null);
  const [series, setSeries] = useState<number[]>([]);
  const [history, setHistory] = useState<CommandRecord[]>([]);
  const [scenes, setScenes] = useState<{ id: string; name: string; hint: string }[]>([]);
  const [engine, setEngine] = useState<{ mode: PlanEngine; model: string | null }>({ mode: "local", model: null });
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [activeId, setActiveId] = useState<DeviceId | null>(null);

  const push = useCallback((snapshot: HouseSnapshot) => {
    setState(snapshot);
    setSeries((prev) => [...prev, snapshot.watts].slice(-90));
  }, []);

  // 初始快照：历史、场景、当前引擎
  useEffect(() => {
    let alive = true;
    fetch("/api/state")
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        if (data.state) push(data.state);
        if (Array.isArray(data.history)) setHistory(data.history);
        if (Array.isArray(data.scenes)) setScenes(data.scenes);
        if (data.engine) setEngine(data.engine);
      })
      .catch(() => setError("连不上本地服务，刷新一下试试。"));
    return () => {
      alive = false;
    };
  }, [push]);

  // 屋子每秒推一次状态，用 SSE 就够了，不轮询
  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerEvent;
        if (data.type === "snapshot" || data.type === "state" || data.type === "tick") push(data.state);
      } catch {
        // 忽略坏帧
      }
    };
    return () => source.close();
  }, [push]);

  const command = useCallback(
    async (input: string) => {
      const value = input.trim();
      if (!value) return;
      setPending(true);
      setError("");
      setActiveId(null);
      try {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: value }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "没听懂，换个说法？");
          return;
        }
        setPlan({ reply: data.reply, actions: data.actions, engine: data.engine });
        if (data.state) setState(data.state);
        setText("");
        const log = await (await fetch("/api/history")).json();
        if (Array.isArray(log.history)) setHistory(log.history);
      } catch {
        setError("网络好像断了一下，再说一次。");
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const setDevice = useCallback(async (id: DeviceId, patch: { on?: boolean; level?: number; target?: number } = {}) => {
    setActiveId(id);
    try {
      const res = await fetch("/api/device", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (res.ok && data.state) setState(data.state);
    } catch {
      setError("这个设备没反应，再点一次？");
    }
    window.setTimeout(() => {
      setActiveId((current) => (current === id ? null : current));
    }, 900);
  }, []);

  const clock = state
    ? `${String(Math.floor(state.clock / 60)).padStart(2, "0")}:${String(state.clock % 60).padStart(2, "0")}`
    : "--:--";

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">灯</span>
          <span className="brand-name">掌灯</span>
          <span className="brand-sub">ZhangDeng · 一句话之家</span>
        </div>
        <div className="topbar-right">
          <span className="chip">{engine.mode === "llm" ? `大模型 · ${engine.model ?? "LLM"}` : "本地解析 · 无需 Key"}</span>
          <span className="clock">室内 {clock}</span>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">UTTERANCE → INTENT → HOUSE</p>
        <h1>
          一句话，<em>整间屋子</em>都应声而动。
        </h1>
        <p className="lede">
          对着屋子说一句中文，它先听懂你的意思，再把这句意思拆成一条条设备指令——先拉窗帘，再开灯，最后调空调。右边的屋子照着这份指令动，从解析到响应都能看见。
        </p>
      </section>

      <CommandBar
        value={text}
        onChange={setText}
        onSubmit={() => void command(text)}
        pending={pending}
        error={error}
        examples={EXAMPLES}
        onExample={(example) => {
          setText(example);
          void command(example);
        }}
      />

      <SceneBar scenes={scenes} onPick={(name) => void command(name)} pending={pending} />

      <main className="grid">
        <section className="stage">
          <RoomView devices={state?.devices ?? []} clock={state?.clock ?? 0} onPick={setDevice} />
          <IntentCard state={state} result={plan} />
        </section>

        <aside className="side">
          <DevicePanel devices={state?.devices ?? []} activeId={activeId} onSet={setDevice} />
          <EnergyPanel state={state} series={series} />
          <LogPanel history={history} />
        </aside>
      </main>

      <footer className="footer">
        <span>掌灯 ZhangDeng · Next.js 15 / SSE / node:sqlite</span>
        <span>
          没有 API Key 也能跑 · 解析失败自动降级到本地规则 · 源码在{" "}
          <a href="https://github.com/huangb-ux/Ai-object1" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </span>
      </footer>
    </div>
  );
}
