import { DEVICES, DEVICE_MAP, initialDevices } from "./devices";
import { ROOMS } from "./types";
import type { Action, DeviceId, DeviceState, HouseSnapshot, RoomState, ServerEvent } from "./types";

/** 模拟时钟从这里开始走：19:20，刚下班回家 */
const START_CLOCK = 19 * 60 + 20;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 单台设备当前功率（W） */
export function wattsOf(dev: DeviceState): number {
  const def = DEVICE_MAP.get(dev.id);
  if (!def || !dev.on) return 0;
  switch (def.kind) {
    case "light":
      return (def.watts * clamp(dev.level, 0, 100)) / 100;
    case "fan":
      // 风扇、油烟机、浴霸都按档位比例出力（浴霸满档 1000W）
      return (def.watts * clamp(dev.level, 0, 3)) / 3;
    case "screen":
      return def.watts;
    case "plug":
      // 冰箱、排气扇这类纯开关，开着就是满载
      return def.watts;
    case "ac":
      // 26 度为基准，设定温度每低 1 度多约 45W
      return def.watts + Math.max(0, 26 - dev.target) * 45;
    default:
      return 0;
  }
}

export function totalWatts(devices: DeviceState[]): number {
  return devices.reduce((sum, d) => sum + wattsOf(d), 0);
}

/** 按房间汇总功率，顺序跟 ROOMS 一致 */
export function roomWatts(devices: DeviceState[]): RoomState[] {
  return ROOMS.map((room) => ({
    id: room.id,
    name: room.name,
    watts: Math.round(totalWatts(devices.filter((d) => d.room === room.id))),
  }));
}

/** 把一条指令落到一台设备上，返回新状态（不修改入参，方便测试） */
export function applyAction(dev: DeviceState, action: Action): DeviceState {
  const def = DEVICE_MAP.get(dev.id);
  if (!def) return dev;

  let on = dev.on;
  let level = dev.level;
  let target = dev.target;

  if (typeof action.on === "boolean") on = action.on;
  if (typeof action.level === "number") level = clamp(Math.round(action.level), def.minLevel, def.maxLevel);
  if (typeof action.target === "number") target = clamp(Math.round(action.target), 16, 30);

  if (def.kind === "light") {
    // 只说「调到 60%」时，默认就是开灯
    if (typeof action.level === "number" && action.on === undefined) on = level > 0;
    if (on && level === 0) level = 60;
    if (!on) level = 0;
  }

  if (def.kind === "fan") {
    if (typeof action.level === "number" && action.on === undefined) on = level > 0;
    if (on && level < 1) level = 1;
    if (!on) level = 0;
  }

  if (def.kind === "curtain") {
    // 窗帘用 level 表示开合度，没有单独的开关
    if (typeof action.level === "number") on = level > 0;
    if (typeof action.on === "boolean") level = action.on ? 100 : 0;
    on = level > 0;
  }

  if (def.kind === "ac") {
    // 报一个温度 = 顺便把空调打开
    if (typeof action.target === "number") on = true;
  }

  if (def.kind === "screen" && on) level = 100;
  if (def.kind === "plug" && on) level = 100;

  return { id: dev.id, room: dev.room, on, level, target };
}

interface HouseRuntime {
  devices: DeviceState[];
  kwh: number;
  clock: number;
  subs: Set<(event: ServerEvent) => void>;
  timer: ReturnType<typeof setInterval> | null;
}

/** 单进程内存里的一套房。挂在 globalThis 上，热更新时状态不丢。 */
const globalStore = globalThis as unknown as { __zhangdeng?: HouseRuntime };

function runtime(): HouseRuntime {
  if (!globalStore.__zhangdeng) {
    globalStore.__zhangdeng = {
      devices: initialDevices(),
      kwh: 0.42,
      clock: START_CLOCK,
      subs: new Set(),
      timer: null,
    };
  }
  return globalStore.__zhangdeng;
}

export function snapshot(): HouseSnapshot {
  const s = runtime();
  const devices = s.devices.map((d) => ({ ...d }));
  return {
    devices,
    rooms: roomWatts(devices),
    watts: Math.round(totalWatts(devices)),
    kwh: Number(s.kwh.toFixed(2)),
    clock: s.clock,
  };
}

export function subscribe(fn: (event: ServerEvent) => void): () => void {
  const s = runtime();
  s.subs.add(fn);
  ensureTicker();
  return () => {
    s.subs.delete(fn);
  };
}

function ensureTicker(): void {
  const s = runtime();
  if (s.timer) return;
  s.timer = setInterval(() => {
    tick(1);
    broadcast({ type: "tick", state: snapshot() });
  }, 1000);
  // 别让一个心跳定时器把 Node 进程吊着不退出
  const maybe = s.timer as unknown as { unref?: () => void };
  maybe.unref?.();
}

function broadcast(event: ServerEvent): void {
  for (const fn of runtime().subs) {
    try {
      fn(event);
    } catch {
      // 单个订阅者断了，不影响其他人
    }
  }
}

/** 推进模拟时钟（分钟），并累计电量 */
export function tick(minutes: number): HouseSnapshot {
  const s = runtime();
  const watts = totalWatts(s.devices);
  s.kwh += (watts * minutes) / 60 / 1000;
  s.clock = (s.clock + minutes) % 1440;
  return snapshot();
}

/** 依次应用指令，每落一条广播一次，前端就能看到「依次亮起」 */
export function applyActions(actions: Action[], note?: string): HouseSnapshot {
  const s = runtime();
  for (const action of actions) {
    s.devices = s.devices.map((d) => (d.id === action.device ? applyAction(d, action) : d));
    broadcast({ type: "state", state: snapshot(), note });
  }
  return snapshot();
}

/** 直接改一台设备，用于面板上的手动开关 */
export function setDevice(id: DeviceId, patch: Partial<Omit<Action, "device">>): HouseSnapshot {
  return applyActions([{ device: id, ...patch }]);
}

export function resetHouse(): HouseSnapshot {
  const s = runtime();
  s.devices = initialDevices();
  s.kwh = 0.42;
  s.clock = START_CLOCK;
  broadcast({ type: "state", state: snapshot(), note: "已复位" });
  return snapshot();
}

/** 供 UI 用：整屋满载功率，画用电进度条 */
export function fullOnWatts(): number {
  return DEVICES.reduce((sum, def) => sum + def.watts, 0);
}
