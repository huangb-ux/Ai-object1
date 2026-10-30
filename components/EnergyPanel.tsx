"use client";

import { adviceFor } from "@/lib/advice";
import type { HouseSnapshot } from "@/lib/types";

interface EnergyPanelProps {
  state: HouseSnapshot | null;
  series: number[];
}

function sparkPath(series: number[], width: number, height: number): string {
  if (series.length < 2) return "";
  const max = Math.max(1000, ...series);
  const step = width / (series.length - 1);
  return series
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function EnergyPanel({ state, series }: EnergyPanelProps) {
  if (!state) return null;

  const width = 320;
  const height = 72;
  const line = sparkPath(series, width, height);
  const area = line ? `${line} L${width} ${height} L0 ${height} Z` : "";
  const advice = adviceFor(state);
  const fullOn = 948;

  return (
    <section className="panel energy">
      <header className="panel-head">
        <h2 className="panel-title">03 / 用电</h2>
        <span className="panel-note">POWER</span>
      </header>

      <div className="energy-top">
        <div>
          <p className="big-num">
            {state.watts}
            <span className="unit">W</span>
          </p>
          <p className="energy-caption">实时功率 · 全开约 {fullOn} W</p>
        </div>
        <div className="energy-right">
          <p className="big-num small">
            {state.kwh.toFixed(2)}
            <span className="unit">kWh</span>
          </p>
          <p className="energy-caption">今天累计</p>
        </div>
      </div>

      <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffb454" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffb454" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={height - 3} x2={width} y2={height - 3} stroke="#1d2a36" strokeWidth="1" />
        {area && series.length >= 14 ? <path d={area} fill="url(#sparkFill)" /> : null}
        {line ? <path d={line} fill="none" stroke="#ffb454" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /> : null}
      </svg>

      <ul className="advice">
        {advice.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
