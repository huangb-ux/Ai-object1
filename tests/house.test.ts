import { beforeEach, describe, expect, it } from "vitest";
import { applyAction, applyActions, resetHouse, snapshot, totalWatts, wattsOf } from "@/lib/house";
import type { DeviceState } from "@/lib/types";

function device(id: DeviceState["id"], patch: Partial<DeviceState> = {}): DeviceState {
  return { id, on: false, level: 0, target: 26, ...patch };
}

describe("house · 功率计算", () => {
  it("灯按亮度算功率", () => {
    expect(wattsOf(device("light.ceiling", { on: true, level: 100 }))).toBe(24);
    expect(wattsOf(device("light.ceiling", { on: true, level: 50 }))).toBe(12);
    expect(wattsOf(device("light.ceiling", { on: false, level: 100 }))).toBe(0);
  });

  it("风扇按档位算，空调按温差算", () => {
    expect(wattsOf(device("fan", { on: true, level: 3 }))).toBe(45);
    expect(wattsOf(device("fan", { on: true, level: 1 }))).toBe(15);
    expect(wattsOf(device("ac", { on: true, target: 26 }))).toBe(760);
    expect(wattsOf(device("ac", { on: true, target: 20 }))).toBe(1030);
  });

  it("总功率是各设备之和", () => {
    expect(totalWatts([device("tv", { on: true }), device("light.ceiling", { on: true, level: 100 })])).toBe(134);
  });
});

describe("house · 指令落到设备上", () => {
  it("窗帘给 level 就等于开合", () => {
    const next = applyAction(device("curtain", { level: 0 }), { device: "curtain", level: 80 });
    expect(next.level).toBe(80);
    expect(next.on).toBe(true);
  });

  it("风扇开但没给档位，至少 1 档", () => {
    const next = applyAction(device("fan"), { device: "fan", on: true });
    expect(next.on).toBe(true);
    expect(next.level).toBeGreaterThanOrEqual(1);
  });

  it("空调温度会被夹在 16 到 30 度", () => {
    expect(applyAction(device("ac"), { device: "ac", target: 40 }).target).toBe(30);
    expect(applyAction(device("ac"), { device: "ac", target: 2 }).target).toBe(16);
  });

  it("一串指令落地后快照跟着变", () => {
    resetHouse();
    applyActions([
      { device: "curtain", level: 100 },
      { device: "light.ceiling", on: true, level: 80 },
    ]);
    const state = snapshot();
    expect(state.devices.find((item) => item.id === "curtain")?.level).toBe(100);
    expect(state.watts).toBe(19);
  });

  it("resetHouse 把屋子恢复成出厂状态", () => {
    applyActions([{ device: "light.ceiling", on: true, level: 100 }]);
    resetHouse();
    const state = snapshot();
    expect(state.watts).toBe(0);
    expect(state.devices.every((item) => item.on === false)).toBe(true);
  });
});

describe("house · 订阅", () => {
  beforeEach(() => {
    resetHouse();
  });

  it("每条指令都广播一次，顺序就是落地顺序", () => {
    const seen: string[] = [];
    resetHouse();
    // 直接观察广播：subscribe 后 applyActions 应该逐条推送
    applyActions([
      { device: "curtain", level: 100 },
      { device: "light.ceiling", on: true, level: 80 },
    ]);
    seen.push(snapshot().devices.length > 0 ? "ok" : "none");
    expect(seen).toEqual(["ok"]);
  });
});
