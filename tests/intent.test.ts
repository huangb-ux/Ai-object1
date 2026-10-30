import { describe, expect, it } from "vitest";
import { findDevice, findRoom, matchScene, parseIntent } from "@/lib/intent";
import { resetHouse } from "@/lib/house";
import type { HouseSnapshot } from "@/lib/types";

function withDevices(patch: (snapshot: HouseSnapshot) => void): HouseSnapshot {
  const state = resetHouse();
  patch(state);
  return state;
}

describe("intent · 识别房间、设备与场景", () => {
  it("认得设备的别名", () => {
    expect(findDevice("打开电视")).toBe("living.tv");
    expect(findDevice("窗帘拉上")).toBe("living.curtain");
    expect(findDevice("厨房抽油烟机开到 2 档")).toBe("kitchen.hood");
    expect(findDevice("浴室排气扇打开")).toBe("bathroom.fan");
    expect(findDevice("今天天气怎么样")).toBeNull();
  });

  it("认得房间名", () => {
    expect(findRoom("卧室灯打开")).toBe("bedroom");
    expect(findRoom("把书房的灯关掉")).toBe("study");
    expect(findRoom("厨房油烟机")).toBe("kitchen");
    expect(findRoom("卫生间有点冷")).toBe("bathroom");
    expect(findRoom("随便说点什么")).toBeNull();
  });

  it("同一句里同时有房间和设备时，房间决定落到哪一台", () => {
    expect(findDevice("卧室灯打开", "bedroom")).toBe("bedroom.light");
    expect(findDevice("书房台灯打开", "study")).toBe("study.lamp");
    expect(findDevice("卧室灯打开", null)).toBe("bedroom.light");
  });

  it("场景词能命中场景", () => {
    expect(matchScene("我回家了")).toBe("home");
    expect(matchScene("看电影吧")).toBe("movie");
    expect(matchScene("该睡觉了")).toBe("sleep");
    expect(matchScene("随便说点什么")).toBeNull();
  });
});

describe("intent · 一句话解析成指令", () => {
  it("场景会拆成多条指令", () => {
    const plan = parseIntent("我回家了", resetHouse());
    expect(plan.engine).toBe("local");
    expect(plan.reply.length).toBeGreaterThan(0);
    expect(plan.actions.length).toBeGreaterThan(1);
    expect(plan.actions.some((action) => action.device === "living.curtain")).toBe(true);
  });

  it("百分之多少会被读成亮度", () => {
    const plan = parseIntent("把主灯调到 60%", resetHouse());
    const action = plan.actions.find((item) => item.device === "living.light");
    expect(action).toBeDefined();
    expect(action?.level).toBe(60);
    expect(action?.on).toBe(true);
  });

  it("「太亮了」会把灯调暗", () => {
    const state = withDevices((snapshot) => {
      snapshot.devices = snapshot.devices.map((device) =>
        device.id === "living.light" ? { ...device, on: true, level: 100 } : device,
      );
    });
    const plan = parseIntent("太亮了", state);
    const action = plan.actions.find((item) => item.device === "living.light");
    expect(action).toBeDefined();
    expect(action?.level).toBeLessThan(100);
  });

  it("「有点冷」会把空调调高", () => {
    const plan = parseIntent("有点冷", resetHouse());
    const action = plan.actions.find((item) => item.device === "bedroom.ac");
    expect(action).toBeDefined();
    expect(action?.on).toBe(true);
    expect(action?.target).toBeGreaterThan(26);
  });

  it("全关会一次关掉十三台设备", () => {
    const plan = parseIntent("全部关掉", resetHouse());
    expect(plan.actions).toHaveLength(13);
    expect(plan.actions.every((action) => action.on === false || action.level === 0)).toBe(true);
  });

  it("听不懂的话不动设备，但要给回应", () => {
    const plan = parseIntent("今天吃什么", resetHouse());
    expect(plan.actions).toHaveLength(0);
    expect(plan.reply.length).toBeGreaterThan(0);
  });
});
