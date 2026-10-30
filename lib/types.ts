// 屋里就这六样东西。id 用「类型.位置」的写法，方便以后扩展多个房间。
export type DeviceId = "light.ceiling" | "lamp.floor" | "tv" | "fan" | "ac" | "curtain";

export type DeviceKind = "light" | "screen" | "fan" | "ac" | "curtain";

export interface DeviceState {
  id: DeviceId;
  on: boolean;
  /** 灯：亮度 0-100；风扇：档位 0-3；窗帘：开合 0-100 */
  level: number;
  /** 空调设定温度 */
  target: number;
}

export interface HouseSnapshot {
  devices: DeviceState[];
  /** 当前总功率，W */
  watts: number;
  /** 今天已用电量，kWh */
  kwh: number;
  /** 模拟时钟，单位分钟（0-1439） */
  clock: number;
}

/** 一条设备指令。on / level / target 按设备类型选用。 */
export interface Action {
  device: DeviceId;
  on?: boolean;
  level?: number;
  target?: number;
}

/** 指令是谁解析出来的：本地规则，还是大模型 */
export type PlanEngine = "local" | "llm";

export interface Plan {
  actions: Action[];
  reply: string;
  engine: PlanEngine;
}

export interface CommandRecord {
  id: string;
  createdAt: string;
  text: string;
  reply: string;
  engine: PlanEngine;
  actions: Action[];
}

/** 服务端推给前端的事件。前端只认这三种，不用轮询。 */
export type ServerEvent =
  | { type: "snapshot"; state: HouseSnapshot }
  | { type: "state"; state: HouseSnapshot; note?: string }
  | { type: "tick"; state: HouseSnapshot };
