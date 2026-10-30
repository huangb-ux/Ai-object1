"use client";

import { DEVICE_MAP, roomsOf } from "@/lib/devices";
import type { DeviceId, DeviceState, RoomState } from "@/lib/types";

interface DevicePanelProps {
  devices: DeviceState[];
  rooms: RoomState[];
  activeId: DeviceId | null;
  onSet: (id: DeviceId, patch: { on?: boolean; level?: number; target?: number }) => void;
}

function statusOf(device: DeviceState): string {
  const kind = DEVICE_MAP.get(device.id)?.kind;
  if (kind === "curtain") return `${device.level}% 开合`;
  if (!device.on) return "关";
  if (kind === "fan") return `${device.level} 档`;
  if (kind === "ac") return `${device.target}°C`;
  if (kind === "screen") return "播放中";
  if (kind === "plug") return "运行中";
  return `${device.level}%`;
}

export default function DevicePanel({ devices, rooms, activeId, onSet }: DevicePanelProps) {
  const groups = roomsOf(devices).filter((group) => group.devices.length > 0);
  const roomW = (id: string) => rooms.find((room) => room.id === id)?.watts ?? 0;

  return (
    <section className="panel devices">
      <header className="panel-head">
        <h2 className="panel-title">02 / 设备</h2>
        <span className="panel-note">五个房间 · 十三台</span>
      </header>

      <div className="dev-groups">
        {groups.map((group) => (
          <section key={group.room.id} className="dev-group">
            <header className="dev-group-head">
              <h3 className="dev-group-name">
                {group.room.name}
                <span className="dev-group-en">{group.room.label}</span>
              </h3>
              <span className="dev-group-meta">{roomW(group.room.id)} W</span>
            </header>

            <ul className="dev-list">
              {group.devices.map((device) => {
                const def = DEVICE_MAP.get(device.id);
                const kind = def?.kind ?? "light";
                const on = kind === "curtain" ? device.level > 0 : device.on;
                return (
                  <li key={device.id} className={activeId === device.id ? "dev-row on" : "dev-row"}>
                    <div className="dev-main">
                      <span className="dev-name">{def?.name ?? device.id}</span>
                      <span className="dev-state">{statusOf(device)}</span>
                    </div>

                    <div className="dev-controls">
                      {kind === "light" || kind === "curtain" ? (
                        <input
                          className="slider"
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={device.level}
                          aria-label={`${def?.name} 亮度或开合`}
                          onChange={(event) => onSet(device.id, { level: Number(event.target.value) })}
                        />
                      ) : null}

                      {kind === "fan" ? (
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

                      {kind === "ac" ? (
                        <div className="temp">
                          <button
                            type="button"
                            className="gear"
                            onClick={() => onSet(device.id, { on: true, target: device.target - 1 })}
                          >
                            −
                          </button>
                          <span className="temp-value">{device.target}°</span>
                          <button
                            type="button"
                            className="gear"
                            onClick={() => onSet(device.id, { on: true, target: device.target + 1 })}
                          >
                            +
                          </button>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`开关${def?.name ?? device.id}`}
                        className={on ? "switch on" : "switch"}
                        onClick={() =>
                          kind === "curtain"
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
        ))}
      </div>
    </section>
  );
}
