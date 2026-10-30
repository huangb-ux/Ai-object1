"use client";

import { DEVICE_MAP, deviceName } from "@/lib/devices";
import type { DeviceId, DeviceState } from "@/lib/types";

interface DevicePanelProps {
  devices: DeviceState[];
  activeId: DeviceId | null;
  onSet: (id: DeviceId, patch: { on?: boolean; level?: number; target?: number }) => void;
}

function statusOf(device: DeviceState): string {
  if (device.id === "curtain") return `${device.level}% 开合`;
  if (!device.on) return "关";
  if (device.id === "fan") return `${device.level} 档`;
  if (device.id === "ac") return `${device.target}°C`;
  if (device.id === "tv") return "播放中";
  return `${device.level}%`;
}

export default function DevicePanel({ devices, activeId, onSet }: DevicePanelProps) {
  return (
    <section className="panel devices">
      <header className="panel-head">
        <h2 className="panel-title">02 / 设备</h2>
        <span className="panel-note">也可直接点画面里的家具</span>
      </header>

      <ul className="dev-list">
        {devices.map((device) => {
          const def = DEVICE_MAP.get(device.id);
          const on = device.id === "curtain" ? device.level > 0 : device.on;
          return (
            <li key={device.id} className={activeId === device.id ? "dev-row on" : "dev-row"}>
              <div className="dev-main">
                <span className="dev-name">{deviceName(device.id)}</span>
                <span className="dev-state">{statusOf(device)}</span>
              </div>

              <div className="dev-controls">
                {device.id === "light.ceiling" || device.id === "lamp.floor" || device.id === "curtain" ? (
                  <input
                    className="slider"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={device.level}
                    aria-label={`${def?.name} 开合或亮度`}
                    onChange={(event) => onSet(device.id, { level: Number(event.target.value) })}
                  />
                ) : null}

                {device.id === "fan" ? (
                  <div className="gears">
                    {[1, 2, 3].map((gear) => (
                      <button
                        key={gear}
                        type="button"
                        className={device.on && device.level === gear ? "gear on" : "gear"}
                        onClick={() => onSet(device.id, { on: true, level: gear })}
                      >
                        {gear}
                      </button>
                    ))}
                  </div>
                ) : null}

                {device.id === "ac" ? (
                  <div className="temp">
                    <button type="button" className="gear" onClick={() => onSet(device.id, { on: true, target: device.target - 1 })}>
                      −
                    </button>
                    <span className="temp-value">{device.target}°</span>
                    <button type="button" className="gear" onClick={() => onSet(device.id, { on: true, target: device.target + 1 })}>
                      +
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`开关${deviceName(device.id)}`}
                  className={on ? "switch on" : "switch"}
                  onClick={() =>
                    device.id === "curtain"
                      ? onSet(device.id, { level: device.level > 0 ? 0 : 80 })
                      : onSet(device.id, { on: !device.on })
                  }
                >
                  <span className="knob" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
