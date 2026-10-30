import { DEVICE_MAP, DEVICES, deviceFullName } from "./devices";
import type { DeviceId, HouseSnapshot } from "./types";

/** 满载功率：所有设备同时开到底 */
const FULL_WATTS = DEVICES.reduce((sum, def) => sum + def.watts, 0);

/**
 * 纯函数：根据当前整套房的状态给出 1-3 条建议。
 * 不调用大模型——这些结论是确定的，用规则算出来反而更快、也不会胡说。
 */
export function adviceFor(state: HouseSnapshot): string[] {
  const out: string[] = [];

  const get = (id: DeviceId) => state.devices.find((d) => d.id === id);
  const isOn = (id: DeviceId) => Boolean(get(id)?.on);
  const levelOf = (id: DeviceId) => get(id)?.level ?? 0;

  const onAcs = state.devices.filter((d) => DEVICE_MAP.get(d.id)?.kind === "ac" && d.on);
  const activeCount = state.devices.filter(
    (d) => DEVICE_MAP.get(d.id)?.kind !== "curtain" && d.on,
  ).length;
  const hour = Math.floor(state.clock / 60);

  if (activeCount === 0) {
    out.push("整套房全关，0 W，连冰箱都断了。要出门就说「我出门了」。");
    return out;
  }

  // 浴霸是全屋最费电的一台，开着就该提醒
  const heater = get("bathroom.heater");
  if (heater?.on) {
    out.push(
      `浴霸开着 ${heater.level} 档就是 ${Math.round((1000 * heater.level) / 3)} W，洗完记得关——它一台顶四台空调待机。`,
    );
  }

  // 两间空调同时开
  if (onAcs.length >= 2) {
    const names = onAcs.map((d) => deviceFullName(d.id)).join("和");
    out.push(`${names}同时开着，关掉一间、另一间调高 1 度，体感差不了多少。`);
  }

  // 空调温度压得太低
  const cold = onAcs.find((d) => d.target <= 23);
  if (cold) {
    const save = Math.round(((26 - cold.target) * 45 * 8) / 1000 * 10) / 10;
    out.push(
      `${deviceFullName(cold.id)} ${cold.target} 度有点狠。设到 26 度，按一晚 8 小时算能省约 ${save} 度电。`,
    );
  }

  // 油烟机最高档空转
  const hood = get("kitchen.hood");
  if (hood?.on && hood.level >= 3) {
    out.push("油烟机 3 档 210 W，爆炒完降到 1 档再关，别让它空转。");
  }

  // 半夜书房还亮着
  if ((hour >= 23 || hour < 6) && isOn("study.lamp")) {
    out.push("这个点了书房台灯还亮着，是忘了关，还是还在改最后一版？");
  }

  // 整屋功率偏高
  if (state.watts >= 1800) {
    out.push(
      `现在 ${state.watts} W，快赶上满载 ${(FULL_WATTS / 1000).toFixed(1)} kW 了。先把空调调高 1 度，或者关掉没在用的灯。`,
    );
  }

  // 电视亮着的时候主灯其实多余
  if (isOn("living.tv") && isOn("living.light") && levelOf("living.light") >= 50) {
    out.push("电视亮着的时候，客厅主灯其实可以关掉，屏幕本身就是光源。");
  }

  // 白天客厅主灯还开着
  if (hour >= 9 && hour <= 17 && isOn("living.light") && levelOf("living.light") >= 60) {
    out.push("现在是白天，客厅主灯调到 40% 一样够用，还能少开点灯。");
  }

  // 只剩冰箱在待机
  if (activeCount === 1 && isOn("kitchen.fridge")) {
    out.push("只剩冰箱在待机，60 W，这个数很正常，不用管它。");
  }

  if (out.length === 0) {
    out.push(
      `当前 ${state.watts} W，全开大约 ${(FULL_WATTS / 1000).toFixed(1)} kW，这套房还算克制。`,
    );
  }

  return out.slice(0, 3);
}
