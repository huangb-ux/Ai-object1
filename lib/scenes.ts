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
 * 服务端会一条一条下发，前端看到的就是「窗帘先动、灯再亮、空调最后」。
 */
export const SCENES: SceneDef[] = [
  {
    id: "home",
    name: "回家",
    hint: "客厅窗帘拉开、客厅和主卧亮灯、主卧空调 26 度",
    keywords: ["我回家了", "回家", "到家", "回来了", "我回来"],
    actions: [
      { device: "living.curtain", level: 85 },
      { device: "living.light", on: true, level: 75 },
      { device: "bedroom.light", on: true, level: 40 },
      { device: "kitchen.light", on: true, level: 70 },
      { device: "bedroom.ac", on: true, target: 26 },
    ],
    reply: "欢迎回家。窗帘先开，客厅、主卧、厨房的灯都给你留着，主卧空调 26 度。",
  },
  {
    id: "away",
    name: "离家",
    hint: "十三台一起关，窗帘合上",
    keywords: ["出门", "离家", "上班", "我走了", "不在家"],
    actions: [
      { device: "living.light", on: false },
      { device: "living.tv", on: false },
      { device: "living.curtain", level: 0 },
      { device: "bedroom.light", on: false },
      { device: "bedroom.ac", on: false },
      { device: "study.lamp", on: false },
      { device: "study.ac", on: false },
      { device: "kitchen.light", on: false },
      { device: "kitchen.hood", on: false },
      { device: "kitchen.fridge", on: false },
      { device: "bathroom.light", on: false },
      { device: "bathroom.heater", on: false },
      { device: "bathroom.fan", on: false },
    ],
    reply: "十三台全关了，窗帘也合上，冰箱断了记得别放生鲜。路上小心。",
  },
  {
    id: "movie",
    name: "观影",
    hint: "客厅窗帘合、主灯关、电视开",
    keywords: ["看电影", "观影", "追剧", "看电影模式"],
    actions: [
      { device: "living.curtain", level: 0 },
      { device: "living.light", on: false },
      { device: "living.tv", on: true },
      { device: "bedroom.ac", on: true, target: 24 },
    ],
    reply: "观影模式。客厅窗帘合上、主灯关掉，电视亮起来，主卧空调 24 度。",
  },
  {
    id: "focus",
    name: "专注",
    hint: "书房台灯全亮、书房空调 25 度",
    keywords: ["专注", "工作", "写代码", "看书", "学习", "加班"],
    actions: [
      { device: "study.lamp", on: true, level: 100 },
      { device: "study.ac", on: true, target: 25 },
      { device: "living.tv", on: false },
      { device: "kitchen.hood", on: false },
    ],
    reply: "专注模式：书房台灯给满、空调 25 度，客厅电视和油烟机都关了。",
  },
  {
    id: "sleep",
    name: "晚安",
    hint: "客厅全关、主卧空调 26 度",
    keywords: ["晚安", "睡觉", "睡了", "睡前"],
    actions: [
      { device: "living.light", on: false },
      { device: "living.tv", on: false },
      { device: "living.curtain", level: 0 },
      { device: "kitchen.light", on: false },
      { device: "bathroom.light", on: false },
      { device: "bathroom.heater", on: false },
      { device: "bedroom.light", on: false },
      { device: "bedroom.ac", on: true, target: 26 },
    ],
    reply: "晚安。客厅、厨房、浴室都关了，窗帘合上，主卧空调 26 度。",
  },
  {
    id: "morning",
    name: "起床",
    hint: "窗帘全开、灯微亮、空调关",
    keywords: ["起床", "早安", "早上好", "天亮了"],
    actions: [
      { device: "living.curtain", level: 100 },
      { device: "bedroom.light", on: true, level: 45 },
      { device: "kitchen.light", on: true, level: 70 },
      { device: "bedroom.ac", on: false },
      { device: "study.ac", on: false },
    ],
    reply: "早安。窗帘全拉开了，主卧和厨房的灯亮着，两间空调都关了。",
  },
];

export const SCENE_MAP: Map<SceneId, SceneDef> = new Map(SCENES.map((s) => [s.id, s]));

export const SCENE_ACTIONS = new Map<SceneId, Action[]>(SCENES.map((s) => [s.id, s.actions]));

export type { DeviceId };
