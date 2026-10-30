// 一整套房子：五个房间、十三台设备。id 统一用「房间.类型」的写法，
// 这样解析、分组、画户型图都只需要看 id 的前缀。

export type RoomId = "living" | "bedroom" | "study" | "kitchen" | "bathroom";

export interface RoomMeta {
  id: RoomId;
  /** 中文名，回复和日志里用这个 */
  name: string;
  /** 户型图上的英文标注 */
  label: string;
}

/** 房间元数据：顺序就是户型图从左上开始的绘制顺序 */
export const ROOMS: RoomMeta[] = [
  { id: "living", name: "客厅", label: "LIVING" },
  { id: "bedroom", name: "主卧", label: "BEDROOM" },
  { id: "study", name: "书房", label: "STUDY" },
  { id: "kitchen", name: "厨房", label: "KITCHEN" },
  { id: "bathroom", name: "浴室", label: "BATH" },
];

export const ROOM_MAP: Map<RoomId, RoomMeta> = new Map(ROOMS.map((room) => [room.id, room]));

/** 十三台设备的 id。写成元组是为了让 zod 的 z.enum 直接复用它 */
export const DEVICE_IDS = [
  "living.light",
  "living.tv",
  "living.curtain",
  "bedroom.light",
  "bedroom.ac",
  "study.lamp",
  "study.ac",
  "kitchen.light",
  "kitchen.hood",
  "kitchen.fridge",
  "bathroom.light",
  "bathroom.heater",
  "bathroom.fan",
] as const;

export type DeviceId = (typeof DEVICE_IDS)[number];

/**
 * 能力模型只有这几种，房间再多也是它们拼出来的：
 * light 灯（on + level 调光）、screen 屏幕（纯开关）、fan 风扇/油烟机/浴霸（on + level 档位）、
 * ac 空调（on + target 温度）、curtain 窗帘（level 开合）、plug 纯开关电器（冰箱、排气扇）。
 */
export type DeviceKind = "light" | "screen" | "fan" | "ac" | "curtain" | "plug";

export interface DeviceState {
  id: DeviceId;
  /** 这台设备属于哪个房间 */
  room: RoomId;
  on: boolean;
  /** 灯：亮度 0-100；风扇/浴霸/油烟机：档位 0-3；窗帘：开合 0-100 */
  level: number;
  /** 空调设定温度 */
  target: number;
}

/** 快照里每个房间的实时功率 */
export interface RoomState {
  id: RoomId;
  name: string;
  watts: number;
}

export interface HouseSnapshot {
  devices: DeviceState[];
  /** 按房间汇总的功率，顺序同 ROOMS */
  rooms: RoomState[];
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
