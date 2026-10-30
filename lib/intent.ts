import { DEVICES, DEVICE_MAP } from "./devices";
import { SCENES, SCENE_MAP, type SceneId } from "./scenes";
import { clamp } from "./house";
import type { Action, DeviceId, HouseSnapshot, Plan } from "./types";

const CN_NUM: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3 };

/** 找用户提到的设备。长别名优先，避免「台灯」抢在「落地灯」前面。 */
export function findDevice(text: string): DeviceId | null {
  const entries = DEVICES.flatMap((def) => def.aliases.map((alias) => ({ alias, id: def.id })));
  entries.sort((a, b) => b.alias.length - a.alias.length);
  for (const { alias, id } of entries) {
    if (text.includes(alias)) return id;
  }
  for (const def of DEVICES) {
    if (text.includes(def.name)) return def.id;
  }
  return null;
}

export function matchScene(text: string): SceneId | null {
  for (const scene of SCENES) {
    if (scene.keywords.some((word) => text.includes(word))) return scene.id;
  }
  return null;
}

function replyOf(actions: Action[]): string {
  const parts = actions.map((action) => {
    const def = DEVICE_MAP.get(action.device);
    const name = def?.name ?? action.device;
    if (!def) return name;
    if (def.kind === "light") {
      if (action.on === false) return `关掉${name}`;
      if (typeof action.level === "number") return `${name}调到 ${action.level}%`;
      return `打开${name}`;
    }
    if (def.kind === "fan") {
      return action.on === false ? "关掉风扇" : `风扇开到 ${action.level} 档`;
    }
    if (def.kind === "ac") {
      return action.on === false ? "关掉空调" : `空调 ${action.target} 度`;
    }
    if (def.kind === "curtain") {
      return action.level === 0 ? "拉上窗帘" : `窗帘开到 ${action.level}%`;
    }
    return action.on === false ? `关掉${name}` : `打开${name}`;
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
      if (gear) actions.push({ device: id, on: true, level: CN_NUM[gear[1]] ?? 1 });
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
    case "screen": {
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
  const deviceId = findDevice(t);

  // 场景优先，但前提是这句话没点名具体设备
  if (sceneId && !deviceId) {
    const scene = SCENE_MAP.get(sceneId);
    if (scene) return { actions: scene.actions, reply: scene.reply, engine: "local" };
  }

  // 全关
  if (/(全关|都关|全部关|全灭|都关掉)/.test(t)) {
    const actions: Action[] = DEVICES.map((def) => ({ device: def.id, on: false, level: 0 }));
    return { actions, reply: "全关了。要出门吗？", engine: "local" };
  }

  if (deviceId) {
    const actions = deviceActions(deviceId, t, state);
    if (actions.length > 0) return { actions, reply: replyOf(actions), engine: "local" };
  }

  // 没有点名设备时的体感指令
  if (/(太亮|晃眼|刺眼|亮点太强)/.test(t)) {
    const ceiling = state.devices.find((d) => d.id === "light.ceiling");
    const base = ceiling?.on ? ceiling.level : 80;
    const level = clamp(base - 30, 10, 100);
    const actions: Action[] = [{ device: "light.ceiling", on: true, level }];
    return { actions, reply: `调暗一点，主灯 ${level}%。`, engine: "local" };
  }

  if (/(太暗|看不清|好黑)/.test(t)) {
    const ceiling = state.devices.find((d) => d.id === "light.ceiling");
    const base = ceiling?.on ? ceiling.level : 30;
    const level = clamp(base + 30, 30, 100);
    const actions: Action[] = [{ device: "light.ceiling", on: true, level }];
    return { actions, reply: `把主灯调亮到 ${level}%。`, engine: "local" };
  }

  if (/(有点冷|太冷|好冷)/.test(t)) {
    const ac = state.devices.find((d) => d.id === "ac");
    const target = clamp((ac?.target ?? 26) + 2, 16, 30);
    return { actions: [{ device: "ac", on: true, target }], reply: `空调调高到 ${target} 度，别感冒。`, engine: "local" };
  }

  if (/(有点热|太热|好热)/.test(t)) {
    const ac = state.devices.find((d) => d.id === "ac");
    const target = clamp((ac?.target ?? 26) - 2, 16, 30);
    return { actions: [{ device: "ac", on: true, target }], reply: `空调调低到 ${target} 度，凉快一下。`, engine: "local" };
  }

  return {
    actions: [],
    reply: "这句我没听懂。可以试试「把主灯调到 60%」「我回家了」「空调 26 度」。",
    engine: "local",
  };
}

/** 给测试和调试用：把动作翻成人话 */
export function describeActions(actions: Action[]): string {
  return actions
    .map((a) => {
      const def = DEVICE_MAP.get(a.device);
      const name = def?.name ?? a.device;
      const bits = [
        a.on === undefined ? "" : a.on ? "开" : "关",
        a.level === undefined ? "" : `level=${a.level}`,
        a.target === undefined ? "" : `target=${a.target}`,
      ].filter(Boolean);
      return `${name}:${bits.join(",") || "无变化"}`;
    })
    .join(" | ");
}
