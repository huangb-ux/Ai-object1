import { beforeEach, describe, expect, it } from "vitest";
import { DEVICES, DEVICE_MAP } from "@/lib/devices";
import { applyAction, applyActions, resetHouse, snapshot, subscribe, totalWatts, wattsOf } from "@/lib/house";
import type { DeviceId, DeviceState, ServerEvent } from "@/lib/types";

function device(id: DeviceId, patch: Partial<DeviceState> = {}): DeviceState {
  const def = DEVICE_MAP.get(id);
  return { id, room: def?.room ?? "living", on: false, level: 0, target: 26, ...patch };
}

describe("house · 功率计算", () => {
  it("灯按亮度算功率", () => {
    expect(wattsOf(device("living.light", { on: true, level: 100 }))).toBe(24);
    expect(wattsOf(device("living.light", { on: true, level: 50 }))).toBe(12);
    expect(wattsOf(device("living.light", { on: false, level: 100 }))).toBe(0);
    expect(wattsOf(device("bedroom.light", { on: true, level: 100 }))).toBe(20);
  });

  it("油烟机和浴霸按档位算", () => {
    expect(wattsOf(device("kitchen.hood", { on: true, level: 3 }))).toBe(210);
    expect(wattsOf(device("kitchen.hood", { on: true, level: 1 }))).toBe(70);
    expect(wattsOf(device("bathroom.heater", { on: true, level: 3 }))).toBe(1000);
    expect(wattsOf(device("bathroom.heater", { on: true, level: 1 }))).toBeCloseTo(1000 / 3, 5);
  });

  it("空调按温差算，冰箱这类纯开关按满载算", () => {
    expect(wattsOf(device("bedroom.ac", { on: true, target: 26 }))).toBe(900);
    expect(wattsOf(device("bedroom.ac", { on: true, target: 20 }))).toBe(1170);
    expect(wattsOf(device("kitchen.fridge", { on: true }))).toBe(60);
    expect(wattsOf(device("kitchen.fridge", { on: false }))).toBe(0);
    expect(wattsOf(device("bathroom.fan", { on: true }))).toBe(40);
  });

  it("总功率是各设备之和", () => {
    const devices = [
      device("living.tv", { on: true }),
      device("living.light", { on: true, level: 100 }),
    ];
    expect(totalWatts(devices)).toBe(134);
    expect(totalWatts([...devices, device("bedroom.ac", { on: true, target: 24 })])).toBe(134 + 990);
  });
});

describe("house · 指令落到设备上", () => {
  it("窗帘给 level 就等于开合", () => {
    const next = applyAction(device("living.curtain", { level: 0 }), { device: "living.curtain", level: 80 });
    expect(next.level).toBe(80);
    expect(next.on).toBe(true);
    expect(next.room).toBe("living");
  });

  it("风扇开但没给档位，至少 1 档", () => {
    const next = applyAction(device("kitchen.hood"), { device: "kitchen.hood", on: true });
    expect(next.on).toBe(true);
    expect(next.level).toBeGreaterThanOrEqual(1);
  });

  it("空调温度会被夹在 16 到 30 度", () => {
    expect(applyAction(device("study.ac"), { device: "study.ac", target: 40 }).target).toBe(30);
    expect(applyAction(device("study.ac"), { device: "study.ac", target: 2 }).target).toBe(16);
  });

  it("一串指令落地后快照跟着变", () => {
    resetHouse();
    applyActions([
      { device: "living.curtain", level: 100 },
      { device: "living.light", on: true, level: 80 },
    ]);
    const state = snapshot();
    expect(state.devices.find((item) => item.id === "living.curtain")?.level).toBe(100);
    expect(state.watts).toBe(19);
  });

  it("快照里带上五个房间的实时功率", () => {
    const state = resetHouse();
    expect(state.rooms.map((room) => room.id)).toEqual(["living", "bedroom", "study", "kitchen", "bathroom"]);
    expect(state.rooms.map((room) => room.name)).toEqual(["客厅", "主卧", "书房", "厨房", "浴室"]);
    expect(state.rooms.every((room) => room.watts === 0)).toBe(true);
  });

  it("resetHouse 把整套房恢复成出厂状态", () => {
    applyActions([{ device: "living.light", on: true, level: 100 }]);
    resetHouse();
    const state = snapshot();
    expect(state.watts).toBe(0);
    expect(state.devices.every((item) => item.on === false)).toBe(true);
    expect(state.devices).toHaveLength(DEVICES.length);
  });
});

describe("house · 订阅", () => {
  beforeEach(() => {
    resetHouse();
  });

  it("每条指令都广播一次，顺序就是落地顺序", () => {
    const seen: ServerEvent[] = [];
    const off = subscribe((event) => seen.push(event));
    applyActions([
      { device: "living.curtain", level: 100 },
      { device: "living.light", on: true, level: 80 },
      { device: "bedroom.ac", on: true, target: 24 },
    ]);
    off();

    const states = seen.filter((event) => event.type === "state");
    expect(states).toHaveLength(3);
    expect(states.map((event) => (event.type === "state" ? event.state.watts : -1))).toEqual([0, 19, 1009]);
  });
});
