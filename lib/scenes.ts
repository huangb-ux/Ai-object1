import type { Action, DeviceId } from "./types";

export type SceneId = "home" | "away" | "movie" | "focus" | "sleep" | "morning";

export interface SceneDef {
  id: SceneId;
  name: string;
  hint: string;
  /** 命中场景说的词 */
  keywords: string[];
  actions: Action[];
  reply: string;
}

/**
 * 场景就是一组指令。顺序有意义：
 * 服务端会一条一条下发，前端看到的就是「窗帘先动、灯再亮」。
 */
export const SCENES: SceneDef[] = [
  {
    id: "home",
    name: "回家",
    hint: "窗帘拉开、灯亮、空调 26 度",
    keywords: ["我回家了", "回家", "到家", "回来了", "我回来"],
    actions: [
      { device: "curtain", level: 85 },
      { device: "light.ceiling", on: true, level: 75 },
      { device: "lamp.floor", on: true, level: 35 },
      { device: "ac", on: true, target: 26 },
      { device: "fan", on: true, level: 1 },
    ],
    reply: "欢迎回家。灯给你留着，空调 26 度，先吹会儿风。",
  },
  {
    id: "away",
    name: "离家",
    hint: "全关，窗帘合上",
    keywords: ["出门", "离家", "上班", "我走了", "不在家"],
    actions: [
      { device: "light.ceiling", on: false },
      { device: "lamp.floor", on: false },
      { device: "tv", on: false },
      { device: "fan", on: false },
      { device: "ac", on: false },
      { device: "curtain", level: 0 },
    ],
    reply: "都关了，窗帘也合上了。路上小心。",
  },
  {
    id: "movie",
    name: "观影",
    hint: "主灯关、窗帘合、电视开",
    keywords: ["看电影", "观影", "追剧", "看电影模式"],
    actions: [
      { device: "curtain", level: 0 },
      { device: "light.ceiling", on: false },
      { device: "lamp.floor", on: true, level: 18 },
      { device: "tv", on: true },
      { device: "ac", on: true, target: 24 },
    ],
    reply: "观影模式。灯暗下来了，空调 24 度，别着凉。",
  },
  {
    id: "focus",
    name: "专注",
    hint: "主灯全亮、风扇 2 档",
    keywords: ["专注", "工作", "写代码", "看书", "学习"],
    actions: [
      { device: "curtain", level: 65 },
      { device: "light.ceiling", on: true, level: 100 },
      { device: "lamp.floor", on: true, level: 60 },
      { device: "tv", on: false },
      { device: "fan", on: true, level: 2 },
    ],
    reply: "专注模式，光给足了，风扇 2 档。",
  },
  {
    id: "sleep",
    name: "晚安",
    hint: "灯全灭、空调 26 度",
    keywords: ["晚安", "睡觉", "睡了", "睡前"],
    actions: [
      { device: "light.ceiling", on: false },
      { device: "lamp.floor", on: false },
      { device: "tv", on: false },
      { device: "curtain", level: 0 },
      { device: "ac", on: true, target: 26 },
      { device: "fan", on: true, level: 1 },
    ],
    reply: "晚安。空调 26 度、风扇 1 档，灯都关了。",
  },
  {
    id: "morning",
    name: "起床",
    hint: "窗帘全开、微亮的灯",
    keywords: ["起床", "早安", "早上好", "天亮了"],
    actions: [
      { device: "curtain", level: 100 },
      { device: "light.ceiling", on: true, level: 45 },
      { device: "lamp.floor", on: false },
      { device: "tv", on: false },
      { device: "ac", on: false },
      { device: "fan", on: false },
    ],
    reply: "早安，窗帘拉开了，今天也顺利。",
  },
];

export const SCENE_MAP: Map<SceneId, SceneDef> = new Map(SCENES.map((s) => [s.id, s]));

export const SCENE_ACTIONS = new Map<SceneId, Action[]>(SCENES.map((s) => [s.id, s.actions]));

export type { DeviceId };
