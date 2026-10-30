import type { HouseSnapshot } from "./types";

/**
 * 纯函数：根据当前屋子状态给出 1-3 条建议。
 * 不调用大模型——这些结论是确定的，用规则算出来反而更快、也不会胡说。
 */
export function adviceFor(state: HouseSnapshot): string[] {
  const out: string[] = [];
  const get = (id: string) => state.devices.find((d) => d.id === id);
  const ac = get("ac");
  const fan = get("fan");
  const ceiling = get("light.ceiling");
  const lamp = get("lamp.floor");
  const tv = get("tv");
  const anyOn = state.devices.some((d) => (d.id === "curtain" ? false : d.on));

  if (!anyOn) {
    out.push("屋里全关着，0 W。这份自觉值得表扬。");
    return out;
  }

  if (ac?.on && ac.target <= 23) {
    const save = Math.round(((26 - ac.target) * 45 * 8) / 1000 * 10) / 10;
    out.push(`空调 ${ac.target} 度有点狠。设到 26 度，按一晚 8 小时算能省约 ${save} 度电。`);
  }

  if (ac?.on && fan?.on) {
    out.push("空调配风扇是聪明的组合：风扇帮着循环，空调可以再高 1 度，体感差不多。");
  }

  const hour = Math.floor(state.clock / 60);
  if (hour >= 9 && hour <= 17 && ceiling?.on && ceiling.level >= 60) {
    out.push("现在是白天，主灯调到 40% 一样够用，还能少开点灯。");
  }

  if (tv?.on && ceiling?.on && ceiling.level >= 50) {
    out.push("电视亮着的时候，主灯其实可以关掉，屏幕本身就是光源。");
  }

  if (state.watts >= 900) {
    out.push(`现在 ${state.watts} W，接近满载。先把空调调高 1 度，或者关掉没在用的灯。`);
  }

  if (out.length === 0) {
    out.push(`当前 ${state.watts} W。全开大约 1.0 kW，这间屋子还算克制。`);
  }

  return out.slice(0, 3);
}
