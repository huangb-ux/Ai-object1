import { DEVICES, DEVICE_MAP, defsOf, deviceFullName, roomNameOf } from "./devices";
import { SCENES, SCENE_MAP, type SceneId } from "./scenes";
import { clamp } from "./house";
import type { Action, DeviceId, HouseSnapshot, Plan, RoomId } from "./types";

const CN_NUM: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3 };

/** 句子里可能出现的房间说法。越长的写法越优先（「主卧」压过「卧」）。 */
const ROOM_WORDS: { word: string; room: RoomId }[] = [
  { word: "客厅", room: "living" },
  { word: "起居室", room: "living" },
  { word: "主卧", room: "bedroom" },
  { word: "卧室", room: "bedroom" },
  { word: "书房", room: "study" },
  { word: "厨房", room: "kitchen" },
  { word: "浴室", room: "bathroom" },
  { word: "卫生间", room: "bathroom" },
  { word: "洗手间", room: "bathroom" },
];

/** 找句子里提到的房间；没提就返回 null（由调用方决定默认落哪间） */
export function findRoom(text: string): RoomId | null {
  let best: { word: string; room: RoomId } | null = null;
  for (const entry of ROOM_WORDS) {
    if (!text.includes(entry.word)) continue;
    if (!best || entry.word.length > best.word.length) best = entry;
  }
  return best?.room ?? null;
}

/**
 * 找用户提到的设备。长别名优先，避免「台灯」抢在「书房台灯」前面；
 * 名字撞车时（比如「灯」在四个房间都有），优先句子里点名的那个房间。
 */
export function findDevice(text: string, room: RoomId | null = null): DeviceId | null {
  const entries = DEVICES.flatMap((def) =>
    [def.name, ...def.aliases].map((alias) => ({ alias, id: def.id, room: def.room })),
  );
  entries.sort((a, b) => b.alias.length - a.alias.length);

  const hits = entries.filter((entry) => text.includes(entry.alias));
  if (hits.length === 0) return null;

  const longest = hits[0].alias.length;
  const best = hits.filter((entry) => entry.alias.length === longest);
  if (room) {
    const inRoom = best.find((entry) => entry.room === room);
    if (inRoom) return inRoom.id;
  }
  // 句子里点了别的房间、却只匹配到别处的设备名时，仍然按设备名走
  return best[0].id;
}

export function matchScene(text: string): SceneId | null {
  for (const scene of SCENES) {
    if (scene.keywords.some((word) => text.includes(word))) return scene.id;
  }
  return null;
}

/** 某个房间的主灯（该房间的第一盏灯），没有就返回 null */
function mainLightOf(room: RoomId): DeviceId | null {
  return defsOf(room).find((def) => def.kind === "light")?.id ?? null;
}

/** 挑一台空调：优先句子里那间，其次已经开着的，最后默认主卧 */
function acOf(room: RoomId | null, state: HouseSnapshot): DeviceId {
  if (room) {
    const inRoom = defsOf(room).find((def) => def.kind === "ac");
    if (inRoom) return inRoom.id;
  }
  const running = state.devices.find((dev) => DEVICE_MAP.get(dev.id)?.kind === "ac" && dev.on);
  if (running) return running.id;
  return defsOf("bedroom").find((def) => def.kind === "ac")?.id ?? "bedroom.ac";
}

function replyOf(actions: Action[]): string {
  const parts = actions.map((action) => {
    const def = DEVICE_MAP.get(action.device);
    if (!def) return String(action.device);
    const name = deviceFullName(def.id);
    switch (def.kind) {
      case "light":
        if (action.on === false) return `关掉${name}`;
        if (typeof action.level === "number") return `${name}调到 ${action.level}%`;
        return `打开${name}`;
      case "fan":
        return action.on === false ? `关掉${name}` : `${name}开到 ${action.level ?? 1} 档`;
      case "ac":
        return action.on === false ? `关掉${name}` : `${name} ${action.target ?? 26} 度`;
      case "curtain":
        return action.level === 0 ? `拉上${name}` : `${name}开到 ${action.level}%`;
      default:
        return action.on === false ? `关掉${name}` : `打开${name}`;
    }
  });
  return `好，${parts.join("，")}。`;
}

function deviceActions(id: DeviceId, text: string, state: HouseSnapshot): Action[] {
  const def = DEVICE_MAP.get(id);
  if (!def) return [];
  const dev = state.devices.find((d) => d.id === id);
  const actions: Action[] = [];

  const percent = text.match(/(\d{1,3})\s*(?:%|％|百分之)/);
  const temp = text.match(/(\d{2})\s*(?:度|℃|°)/);
  const gear = text.match(/([1-3一二两二三])\s*档/);
  // 阿拉伯数字和中文数字都要认：「2 档」「两档」都是 2
  const gearLevel = gear ? (CN_NUM[gear[1]] ?? Number(gear[1])) : 0;
  const dim = /(调暗|暗一点|暗些|小一点|弱一点|降一?点)/.test(text);
  const bright = /(调亮|亮一点|亮些|大一点|强一点)/.test(text);
  const open = /(打开|开启|拉开|开)/.test(text);
  const close = /(关上|关闭|关掉|拉上|合上|关)/.test(text);

  switch (def.kind) {
    case "light": {
      if (percent) actions.push({ device: id, on: true, level: Number(percent[1]) });
      else if (dim) actions.push({ device: id, on: true, level: clamp((dev?.level ?? 60) - 25, 10, 100) });
      else if (bright) actions.push({ device: id, on: true, level: clamp((dev?.level ?? 30) + 25, 10, 100) });
      else if (close) actions.push({ device: id, on: false });
      else if (open) actions.push({ device: id, on: true });
      break;
    }
    case "fan": {
      if (gear) actions.push({ device: id, on: true, level: gearLevel || 1 });
      else if (close) actions.push({ device: id, on: false });
      else if (open) actions.push({ device: id, on: true, level: 1 });
      break;
    }
    case "ac": {
      if (temp) actions.push({ device: id, on: true, target: Number(temp[1]) });
      else if (close) actions.push({ device: id, on: false });
      else if (open) actions.push({ device: id, on: true, target: dev?.target ?? 26 });
      break;
    }
    case "curtain": {
      if (percent) actions.push({ device: id, level: Number(percent[1]) });
      else if (open) actions.push({ device: id, level: 100 });
      else if (close) actions.push({ device: id, level: 0 });
      break;
    }
    case "screen":
    case "plug": {
      if (close) actions.push({ device: id, on: false });
      else if (open) actions.push({ device: id, on: true });
      break;
    }
  }
  return actions;
}

/**
 * 本地意图解析：把一句中文拆成结构化指令。
 * 纯函数，不依赖网络，所以没有 API Key 也能完整演示。
 */
export function parseIntent(raw: string, state: HouseSnapshot): Plan {
  const text = raw.trim();
  const t = text.replace(/\s+/g, "").toLowerCase();

  if (!t) {
    return { actions: [], reply: "你还没说话呢，试试「我回家了」。", engine: "local" };
  }

  const sceneId = matchScene(t);
  const room = findRoom(t);
  const deviceId = findDevice(t, room);

  // 场景优先，但前提是这句话没点名具体设备
  if (sceneId && !deviceId) {
    const scene = SCENE_MAP.get(sceneId);
    if (scene) return { actions: scene.actions, reply: scene.reply, engine: "local" };
  }

  // 全关：说了房间就只关那一间
  if (/(全关|都关|全部关|全灭|都关掉)/.test(t)) {
    const targets = room ? DEVICES.filter((def) => def.room === room) : DEVICES;
    const actions: Action[] = targets.map((def) => ({ device: def.id, on: false, level: 0 }));
    const where = room ? roomNameOf(room) : "整套房";
    return { actions, reply: `全关了，${where} ${actions.length} 台一起灭。要出门吗？`, engine: "local" };
  }

  if (deviceId) {
    const actions = deviceActions(deviceId, t, state);
    if (actions.length > 0) return { actions, reply: replyOf(actions), engine: "local" };
  }

  // 没有点名设备时的体感指令：落在句子里那间房，没提就是客厅
  const roomForFeel = room ?? "living";

  if (/(太亮|晃眼|刺眼|亮点太强)/.test(t)) {
    const id = mainLightOf(roomForFeel) ?? "living.light";
    const current = state.devices.find((d) => d.id === id);
    const base = current?.on ? current.level : 80;
    const level = clamp(base - 30, 10, 100);
    return {
      actions: [{ device: id, on: true, level }],
      reply: `调暗一点，${deviceFullName(id)} ${level}%。`,
      engine: "local",
    };
  }

  if (/(太暗|看不清|好黑)/.test(t)) {
    const id = mainLightOf(roomForFeel) ?? "living.light";
    const current = state.devices.find((d) => d.id === id);
    const base = current?.on ? current.level : 30;
    const level = clamp(base + 30, 30, 100);
    return {
      actions: [{ device: id, on: true, level }],
      reply: `把${deviceFullName(id)}调亮到 ${level}%。`,
      engine: "local",
    };
  }

  if (/(有点冷|太冷|好冷)/.test(t)) {
    const id = acOf(room, state);
    const current = state.devices.find((d) => d.id === id);
    const target = clamp((current?.target ?? 26) + 2, 16, 30);
    return {
      actions: [{ device: id, on: true, target }],
      reply: `${deviceFullName(id)}调高到 ${target} 度，别感冒。`,
      engine: "local",
    };
  }

  if (/(有点热|太热|好热)/.test(t)) {
    const id = acOf(room, state);
    const current = state.devices.find((d) => d.id === id);
    const target = clamp((current?.target ?? 26) - 2, 16, 30);
    return {
      actions: [{ device: id, on: true, target }],
      reply: `${deviceFullName(id)}调低到 ${target} 度，凉快一下。`,
      engine: "local",
    };
  }

  return {
    actions: [],
    reply: "这句我没听懂。可以试试「卧室灯打开」「书房空调 24 度」「厨房油烟机 2 档」「我回家了」。",
    engine: "local",
  };
}

/** 给测试和调试用：把动作翻成人话 */
export function describeActions(actions: Action[]): string {
  return actions
    .map((a) => {
      const name = DEVICE_MAP.get(a.device) ? deviceFullName(a.device) : String(a.device);
      const bits = [
        a.on === undefined ? "" : a.on ? "开" : "关",
        a.level === undefined ? "" : `level=${a.level}`,
        a.target === undefined ? "" : `target=${a.target}`,
      ].filter(Boolean);
      return `${name}:${bits.join(",") || "无变化"}`;
    })
    .join(" | ");
}
