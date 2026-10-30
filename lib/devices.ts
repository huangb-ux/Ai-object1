import { ROOMS, ROOM_MAP } from "./types";
import type { DeviceId, DeviceKind, DeviceState, RoomId, RoomMeta } from "./types";

export interface DeviceDef {
  id: DeviceId;
  /** 设备中文名（不带房间），如「主灯」 */
  name: string;
  /** 所属房间 */
  room: RoomId;
  /** 能力模型：决定面板画滑块、档位还是开关 */
  kind: DeviceKind;
  /** 满载功率，W。灯按亮度比例，风扇按档位比例 */
  watts: number;
  minLevel: number;
  maxLevel: number;
  /** 自然语言里的叫法，长得越具体越优先命中 */
  aliases: string[];
  init: { on: boolean; level: number; target: number };
}

/**
 * 十三台设备。顺序决定面板和解析时的默认优先级，
 * 所以客厅主灯放在第一个：含糊的「开灯」默认落在它身上。
 */
export const DEVICES: DeviceDef[] = [
  {
    id: "living.light",
    name: "主灯",
    room: "living",
    kind: "light",
    watts: 24,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["客厅主灯", "客厅的灯", "客厅灯", "主灯", "吸顶灯", "顶灯", "大灯", "灯"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "living.tv",
    name: "电视",
    room: "living",
    kind: "screen",
    watts: 110,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["客厅电视", "电视机", "电视", "屏幕", "电视柜"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "living.curtain",
    name: "窗帘",
    room: "living",
    kind: "curtain",
    watts: 0,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["客厅窗帘", "窗帘", "帘子", "窗纱"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "bedroom.light",
    name: "主灯",
    room: "bedroom",
    kind: "light",
    watts: 20,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["主卧主灯", "卧室主灯", "主卧灯", "卧室灯", "主卧的灯", "卧室的灯", "灯"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "bedroom.ac",
    name: "空调",
    room: "bedroom",
    kind: "ac",
    watts: 900,
    minLevel: 16,
    maxLevel: 30,
    aliases: ["主卧空调", "卧室空调", "主卧的空调", "空调", "冷气", "制冷"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "study.lamp",
    name: "台灯",
    room: "study",
    kind: "light",
    watts: 12,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["书房台灯", "书桌灯", "阅读灯", "台灯", "灯"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "study.ac",
    name: "空调",
    room: "study",
    kind: "ac",
    watts: 820,
    minLevel: 16,
    maxLevel: 30,
    aliases: ["书房空调", "书房的空调", "空调", "冷气"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "kitchen.light",
    name: "吊灯",
    room: "kitchen",
    kind: "light",
    watts: 18,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["厨房吊灯", "厨房灯", "厨房的灯", "吊灯", "灯"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "kitchen.hood",
    name: "油烟机",
    room: "kitchen",
    kind: "fan",
    watts: 210,
    minLevel: 1,
    maxLevel: 3,
    aliases: ["厨房油烟机", "抽油烟机", "油烟机", "烟机", "抽风机", "排烟"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "kitchen.fridge",
    name: "冰箱",
    room: "kitchen",
    kind: "plug",
    watts: 60,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["厨房冰箱", "冰箱", "电冰箱", "冷藏柜"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "bathroom.light",
    name: "镜前灯",
    room: "bathroom",
    kind: "light",
    watts: 15,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["浴室镜前灯", "卫生间镜前灯", "镜前灯", "浴室灯", "卫生间灯", "浴室镜灯", "镜子灯", "灯"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "bathroom.heater",
    name: "浴霸",
    room: "bathroom",
    kind: "fan",
    watts: 1000,
    minLevel: 1,
    maxLevel: 3,
    aliases: ["浴室浴霸", "卫生间浴霸", "浴霸", "暖风机", "取暖灯", "暖风"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "bathroom.fan",
    name: "排气扇",
    room: "bathroom",
    kind: "plug",
    watts: 40,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["浴室排气扇", "卫生间排气扇", "排气扇", "排风扇", "换气扇", "抽风扇", "排气"],
    init: { on: false, level: 0, target: 26 },
  },
];

export const DEVICE_MAP: Map<DeviceId, DeviceDef> = new Map(DEVICES.map((def) => [def.id, def]));

export function deviceName(id: DeviceId): string {
  return DEVICE_MAP.get(id)?.name ?? id;
}

export function roomNameOf(id: RoomId): string {
  return ROOM_MAP.get(id)?.name ?? id;
}

/** 「客厅主灯」这种带房间的名字，回复和日志里用它才不会指代不清 */
export function deviceFullName(id: DeviceId): string {
  const def = DEVICE_MAP.get(id);
  if (!def) return id;
  return `${roomNameOf(def.room)}${def.name}`;
}

/** 某个房间里的设备定义 */
export function defsOf(room: RoomId): DeviceDef[] {
  return DEVICES.filter((def) => def.room === room);
}

export interface RoomGroup<T> {
  room: RoomMeta;
  devices: T[];
}

/** 按房间分组，空房间也保留，方便面板画分组标题 */
export function roomsOf<T extends { room: RoomId }>(items: T[]): RoomGroup<T>[] {
  return ROOMS.map((room) => ({
    room,
    devices: items.filter((item) => item.room === room.id),
  }));
}

/** 满载总功率，给用电面板画进度用 */
export function fullLoadWatts(): number {
  return DEVICES.reduce((sum, def) => sum + def.watts, 0);
}

/** 初始设备状态：从定义里摊平 */
export function initialDevices(): DeviceState[] {
  return DEVICES.map((def) => ({
    id: def.id,
    room: def.room,
    on: def.init.on,
    level: def.init.level,
    target: def.init.target,
  }));
}
