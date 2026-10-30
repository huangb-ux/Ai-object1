import { describe, expect, it } from "vitest";
import { adviceFor } from "@/lib/advice";
import { resetHouse } from "@/lib/house";
import type { HouseSnapshot } from "@/lib/types";

function withDevices(patch: (snapshot: HouseSnapshot) => void): HouseSnapshot {
  const state = resetHouse();
  patch(state);
  return state;
}

describe("advice · 用电建议", () => {
  it("全关的时候也给一句话", () => {
    const list = adviceFor(resetHouse());
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(3);
    expect(list.every((line) => line.length > 0)).toBe(true);
  });

  it("空调开得很低时提醒温度", () => {
    const state = withDevices((snapshot) => {
      snapshot.devices = snapshot.devices.map((device) =>
        device.id === "bedroom.ac" ? { ...device, on: true, target: 16 } : device,
      );
    });
    const list = adviceFor(state);
    expect(list.length).toBeGreaterThan(0);
    expect(list.join(" ")).toContain("空调");
  });

  it("浴霸开着时会点名浴霸", () => {
    const state = withDevices((snapshot) => {
      snapshot.devices = snapshot.devices.map((device) =>
        device.id === "bathroom.heater" ? { ...device, on: true, level: 2 } : device,
      );
    });
    expect(adviceFor(state).join(" ")).toContain("浴霸");
  });

  it("冰箱单独待机时不报警", () => {
    const state = withDevices((snapshot) => {
      snapshot.devices = snapshot.devices.map((device) =>
        device.id === "kitchen.fridge" ? { ...device, on: true } : { ...device, on: false },
      );
    });
    const list = adviceFor(state);
    expect(list).toHaveLength(1);
    expect(list[0]).toContain("冰箱");
  });

  it("整屋开满的时候最多给三条", () => {
    const state = withDevices((snapshot) => {
      snapshot.devices = snapshot.devices.map((device) => ({
        ...device,
        on: true,
        level: device.id === "living.curtain" ? 0 : 3,
        target: 22,
      }));
    });
    const list = adviceFor(state);
    expect(list.length).toBeLessThanOrEqual(3);
    expect(list.every((line) => line.length > 0)).toBe(true);
  });
});
