import { describe, expect, it } from "vitest";
import { DEVICES, DEVICE_MAP, defsOf, deviceFullName, roomsOf } from "@/lib/devices";
import { applyActions, resetHouse, roomWatts, snapshot, totalWatts, wattsOf } from "@/lib/house";
import { findDevice, parseIntent } from "@/lib/intent";
import { ROOMS } from "@/lib/types";

describe("rooms · 五个房间的设备分布", () => {
  it("一共五个房间，顺序固定", () => {
    expect(ROOMS.map((room) => room.id)).toEqual(["living", "bedroom", "study", "kitchen", "bathroom"]);
    expect(ROOMS.map((room) => room.name)).toEqual(["客厅", "主卧", "书房", "厨房", "浴室"]);
  });

  it("每个房间至少两台设备", () => {
    for (const room of ROOMS) {
      expect(defsOf(room.id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("设备总数是十三台，每台的 room 都和房间对得上", () => {
    expect(DEVICES).toHaveLength(13);
    for (const def of DEVICES) {
      expect(def.id.startsWith(`${def.room}.`)).toBe(true);
      expect(DEVICE_MAP.get(def.id)?.room).toBe(def.room);
    }
  });

  it("roomsOf 按房间分组，组内顺序与 ROOMS 一致", () => {
    const state = resetHouse();
    const groups = roomsOf(state.devices);
    expect(groups).toHaveLength(5);
    expect(groups.map((group) => group.room.id)).toEqual(ROOMS.map((room) => room.id));
    expect(groups.reduce((sum, group) => sum + group.devices.length, 0)).toBe(13);
    for (const group of groups) {
      expect(group.devices.every((device) => device.room === group.room.id)).toBe(true);
    }
  });

  it("浴室有三台：镜前灯、浴霸、排气扇", () => {
    expect(defsOf("bathroom").map((def) => def.id)).toEqual([
      "bathroom.light",
      "bathroom.heater",
      "bathroom.fan",
    ]);
    expect(deviceFullName("bathroom.heater")).toBe("浴室浴霸");
  });
});

describe("rooms · 带房间名的自然语言", () => {
  it("「卧室灯打开」只影响主卧主灯", () => {
    const plan = parseIntent("卧室灯打开", resetHouse());
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].device).toBe("bedroom.light");
    expect(plan.actions[0].on).toBe(true);
    expect(plan.actions.some((action) => action.device === "living.light")).toBe(false);
  });

  it("「书房空调调到 24 度」目标是 24", () => {
    const plan = parseIntent("书房空调调到 24 度", resetHouse());
    const action = plan.actions.find((item) => item.device === "study.ac");
    expect(action).toBeDefined();
    expect(action?.target).toBe(24);
    expect(action?.on).toBe(true);
    expect(plan.actions).toHaveLength(1);
  });

  it("「厨房油烟机 2 档」档位是 2", () => {
    const plan = parseIntent("厨房油烟机 2 档", resetHouse());
    const action = plan.actions.find((item) => item.device === "kitchen.hood");
    expect(action).toBeDefined();
    expect(action?.level).toBe(2);
    expect(action?.on).toBe(true);
  });

  it("「浴室浴霸 2 档」档位是 2", () => {
    const plan = parseIntent("浴室浴霸 2 档", resetHouse());
    const action = plan.actions.find((item) => item.device === "bathroom.heater");
    expect(action).toBeDefined();
    expect(action?.level).toBe(2);
  });

  it("「浴室排气扇打开」只影响排气扇", () => {
    const plan = parseIntent("浴室排气扇打开", resetHouse());
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].device).toBe("bathroom.fan");
    expect(findDevice("浴室排气扇打开", "bathroom")).toBe("bathroom.fan");
  });

  it("点房名全关只关那一间", () => {
    const plan = parseIntent("厨房全关", resetHouse());
    expect(plan.actions).toHaveLength(3);
    expect(plan.actions.every((action) => action.device.startsWith("kitchen."))).toBe(true);
  });
});

describe("rooms · 功率与房间汇总", () => {
  it("全屋总功率等于各设备之和", () => {
    resetHouse();
    applyActions(
      DEVICES.map((def) => ({
        device: def.id,
        on: true,
        level: def.kind === "fan" ? 2 : 100,
        target: 24,
      })),
    );
    const state = snapshot();
    const manual = state.devices.reduce((sum, device) => sum + wattsOf(device), 0);
    expect(totalWatts(state.devices)).toBeCloseTo(manual, 6);
    expect(state.watts).toBe(Math.round(manual));
  });

  it("按房间汇总的功率加起来约等于全屋功率", () => {
    resetHouse();
    applyActions([
      { device: "living.light", on: true, level: 50 },
      { device: "bedroom.ac", on: true, target: 24 },
      { device: "kitchen.fridge", on: true },
      { device: "bathroom.heater", on: true, level: 2 },
    ]);
    const state = snapshot();
    const rooms = roomWatts(state.devices);
    expect(rooms).toHaveLength(5);
    expect(rooms.find((room) => room.id === "living")?.watts).toBe(12);
    expect(rooms.find((room) => room.id === "bedroom")?.watts).toBe(990);
    expect(rooms.find((room) => room.id === "kitchen")?.watts).toBe(60);
    const roomSum = rooms.reduce((sum, room) => sum + room.watts, 0);
    expect(Math.abs(roomSum - state.watts)).toBeLessThanOrEqual(3);
  });
});
