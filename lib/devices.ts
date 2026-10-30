import type { DeviceId, DeviceKind } from "./types";

export interface DeviceDef {
  id: DeviceId;
  name: string;
  room: string;
  kind: DeviceKind;
  /** 满功率，W */
  watts: number;
  minLevel: number;
  maxLevel: number;
  /** 中文别名。越具体的放前面，解析时按长度优先匹配。 */
  aliases: string[];
  init: { on: boolean; level: number; target: number };
}

export const DEVICES: DeviceDef[] = [
  {
    id: "light.ceiling",
    name: "主灯",
    room: "客厅",
    kind: "light",
    watts: 24,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["客厅灯", "吸顶灯", "主灯", "顶灯", "大灯"],
    init: { on: false, level: 0, target: 0 },
  },
  {
    id: "lamp.floor",
    name: "落地灯",
    room: "客厅",
    kind: "light",
    watts: 9,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["落地灯", "台灯", "氛围灯", "小灯", "地灯"],
    init: { on: false, level: 0, target: 0 },
  },
  {
    id: "tv",
    name: "电视",
    room: "客厅",
    kind: "screen",
    watts: 110,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["电视", "电视剧", "电视柜"],
    init: { on: false, level: 0, target: 0 },
  },
  {
    id: "fan",
    name: "风扇",
    room: "客厅",
    kind: "fan",
    watts: 45,
    minLevel: 0,
    maxLevel: 3,
    aliases: ["风扇", "电扇"],
    init: { on: false, level: 0, target: 0 },
  },
  {
    id: "ac",
    name: "空调",
    room: "客厅",
    kind: "ac",
    watts: 760,
    minLevel: 16,
    maxLevel: 30,
    aliases: ["空调", "冷气", "制冷"],
    init: { on: false, level: 0, target: 26 },
  },
  {
    id: "curtain",
    name: "窗帘",
    room: "客厅",
    kind: "curtain",
    watts: 0,
    minLevel: 0,
    maxLevel: 100,
    aliases: ["窗帘", "帘子"],
    init: { on: false, level: 0, target: 0 },
  },
];

export const DEVICE_MAP: Map<DeviceId, DeviceDef> = new Map(DEVICES.map((d) => [d.id, d]));

export function deviceName(id: DeviceId): string {
  return DEVICE_MAP.get(id)?.name ?? id;
}
