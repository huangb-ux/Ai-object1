"use client";

import { DEVICE_MAP } from "@/lib/devices";
import type { DeviceId, DeviceState, RoomId, RoomState } from "@/lib/types";

interface RoomViewProps {
  devices: DeviceState[];
  rooms: RoomState[];
  clock: number;
  onPick: (id: DeviceId) => void;
}

/**
 * 户型图坐标（viewBox 0 0 1040 700）：
 *   外墙 28..1012 × 28..672
 *   上排：主卧 28..360 | 书房 360..700 | 浴室 700..1012（高 28..388）
 *   下排：客厅 28..640 | 厨房 640..1012（高 388..672）
 */
const PLAN = { w: 1040, h: 700 };

/** 旋转的扇叶：油烟机、浴霸、排气扇共用。档位越高转得越快。 */
function Blades({ cx, cy, r, speed }: { cx: number; cy: number; r: number; speed: number }) {
  const spinning = speed > 0;
  const duration = Math.max(0.45, 2.6 - speed * 0.5);
  return (
    <g
      className="blades"
      style={{
        animation: `spin ${duration}s linear infinite`,
        animationPlayState: spinning ? "running" : "paused",
        transformOrigin: `${cx}px ${cy}px`,
        transformBox: "view-box",
        opacity: spinning ? 1 : 0.4,
        transition: "opacity .5s",
      }}
    >
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <g key={angle} transform={`rotate(${angle} ${cx} ${cy})`}>
          <ellipse
            cx={cx + r * 0.56}
            cy={cy}
            rx={r * 0.54}
            ry={r * 0.17}
            fill="#22303c"
            stroke="#2f4150"
            strokeWidth="0.8"
          />
        </g>
      ))}
    </g>
  );
}

export default function RoomView({ devices, rooms, clock, onPick }: RoomViewProps) {
  const byId = new Map(devices.map((device) => [device.id, device]));

  const get = (id: DeviceId): DeviceState => {
    const found = byId.get(id);
    if (found) return found;
    const def = DEVICE_MAP.get(id);
    return { id, room: def?.room ?? "living", on: false, level: 0, target: def?.init.target ?? 26 };
  };

  const roomW = (id: RoomId) => rooms.find((room) => room.id === id)?.watts ?? 0;

  /** 灯的光晕强度：0 到 1 */
  const glowOf = (dev: DeviceState) => (dev.on ? 0.3 + (dev.level / 100) * 0.7 : 0);
  const gearOf = (dev: DeviceState) => (dev.on ? dev.level : 0);

  const livingLight = get("living.light");
  const livingTv = get("living.tv");
  const livingCurtain = get("living.curtain");
  const bedroomLight = get("bedroom.light");
  const bedroomAc = get("bedroom.ac");
  const studyLamp = get("study.lamp");
  const studyAc = get("study.ac");
  const kitchenLight = get("kitchen.light");
  const kitchenHood = get("kitchen.hood");
  const kitchenFridge = get("kitchen.fridge");
  const bathLight = get("bathroom.light");
  const bathHeater = get("bathroom.heater");
  const bathFan = get("bathroom.fan");

  const hour = Math.floor(clock / 60);
  const evening = hour >= 18 || hour < 6;

  // 窗帘：开合比例决定两片帘子沿窗洞的长度，0 = 合拢，100 = 收到两端
  const curtainOpen = livingCurtain.level / 100;
  const panelH = 28 + (1 - curtainOpen) * 67;

  return (
    <div className="room">
      <svg viewBox={`0 0 ${PLAN.w} ${PLAN.h}`} role="img" aria-label="五间房户型图，点击任意设备可以开关">
        <defs>
          <linearGradient id="floorLiving" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17262f" />
            <stop offset="100%" stopColor="#0e1a22" />
          </linearGradient>
          <linearGradient id="floorBedroom" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a2531" />
            <stop offset="100%" stopColor="#0f1822" />
          </linearGradient>
          <linearGradient id="floorStudy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17222c" />
            <stop offset="100%" stopColor="#0d161e" />
          </linearGradient>
          <linearGradient id="floorKitchen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18232d" />
            <stop offset="100%" stopColor="#0e1820" />
          </linearGradient>
          <linearGradient id="floorBath" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16212b" />
            <stop offset="100%" stopColor="#0c151d" />
          </linearGradient>

          {/* 灯光：暖色光晕 */}
          <radialGradient id="pool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe0ae" stopOpacity="0.72" />
            <stop offset="40%" stopColor="#ffb454" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffb454" stopOpacity="0" />
          </radialGradient>
          {/* 浴霸：偏橙红的暖光 */}
          <radialGradient id="heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff9a4a" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#ff7a38" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ff7a38" stopOpacity="0" />
          </radialGradient>
          {/* 屏幕：冷色光 */}
          <radialGradient id="screenGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9fd8ff" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#5aa9e6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#5aa9e6" stopOpacity="0" />
          </radialGradient>
          {/* 冰箱：一点点冷光 */}
          <radialGradient id="coolGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9fe4ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#9fe4ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#cfe9ff" />
            <stop offset="100%" stopColor="#6fb6ea" />
          </linearGradient>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={evening ? "#0c1a28" : "#1b3a52"} />
            <stop offset="100%" stopColor={evening ? "#16324a" : "#2b6b8c"} />
          </linearGradient>
          <radialGradient id="moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e9f4ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e9f4ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="moonBeam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#cfe4ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#cfe4ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a566d" />
            <stop offset="55%" stopColor="#6f92ab" />
            <stop offset="100%" stopColor="#2c4256" />
          </linearGradient>
        </defs>

        {/* ---------- 地板 ---------- */}
        <rect x="28" y="28" width="332" height="360" fill="url(#floorBedroom)" />
        <rect x="360" y="28" width="340" height="360" fill="url(#floorStudy)" />
        <rect x="700" y="28" width="312" height="360" fill="url(#floorBath)" />
        <rect x="28" y="388" width="612" height="284" fill="url(#floorLiving)" />
        <rect x="640" y="388" width="372" height="284" fill="url(#floorKitchen)" />

        {/* ---------- 墙 ---------- */}
        <g stroke="#32485d" strokeWidth="4" strokeLinecap="square" fill="none">
          <line x1="28" y1="28" x2="1012" y2="28" />
          <line x1="28" y1="672" x2="540" y2="672" />
          <line x1="610" y1="672" x2="1012" y2="672" />
          <line x1="28" y1="28" x2="28" y2="672" />
          <line x1="1012" y1="28" x2="1012" y2="672" />
        </g>
        <g stroke="#2e4356" strokeWidth="3.5" strokeLinecap="square" fill="none">
          <line x1="360" y1="28" x2="360" y2="388" />
          <line x1="700" y1="28" x2="700" y2="388" />
          {/* 横向隔墙，三个门洞：主卧↔客厅、书房↔客厅、浴室↔厨房 */}
          <line x1="28" y1="388" x2="120" y2="388" />
          <line x1="190" y1="388" x2="430" y2="388" />
          <line x1="500" y1="388" x2="940" y2="388" />
          <line x1="1000" y1="388" x2="1012" y2="388" />
          {/* 下排竖墙，留厨房门 */}
          <line x1="640" y1="388" x2="640" y2="520" />
          <line x1="640" y1="590" x2="640" y2="672" />
        </g>
        {/* 门洞的地面标记 */}
        <g stroke="#4a6478" strokeWidth="1.6">
          <line x1="120" y1="388" x2="190" y2="388" />
          <line x1="430" y1="388" x2="500" y2="388" />
          <line x1="940" y1="388" x2="1000" y2="388" />
          <line x1="640" y1="520" x2="640" y2="590" />
        </g>
        {/* 入户门 */}
        <path d="M540 672 A 70 70 0 0 1 610 602" fill="none" stroke="#4a6478" strokeWidth="1.6" />
        <text className="plan-meta" x="575" y="692" textAnchor="middle">
          入户
        </text>

        {/* ================= 主卧 ================= */}
        <g>
          <ellipse
            cx="296"
            cy="312"
            rx="106"
            ry="84"
            fill="url(#pool)"
            style={{ opacity: glowOf(bedroomLight), transition: "opacity .8s" }}
          />
          {/* 床 */}
          <g>
            <rect x="56" y="120" width="180" height="240" rx="7" fill="#1b2836" stroke="#3d5568" strokeWidth="2" />
            <rect x="70" y="134" width="70" height="42" rx="4" fill="#26343f" />
            <rect x="152" y="134" width="70" height="42" rx="4" fill="#26343f" />
            <line x1="56" y1="196" x2="236" y2="196" stroke="#1f2b38" strokeWidth="1.5" />
            <path d="M56 200 L236 200 L236 360 L56 360 Z" fill="#1f2c3a" opacity="0.55" />
          </g>
          {/* 床头柜 */}
          <rect x="244" y="130" width="50" height="50" rx="3" fill="#1f2d3b" stroke="#3d5568" strokeWidth="1.6" />
          {/* 衣柜 */}
          <g>
            <rect x="300" y="90" width="52" height="180" rx="3" fill="#1f2d3b" stroke="#3d5568" strokeWidth="1.8" />
            <line x1="326" y1="90" x2="326" y2="270" stroke="#3a5164" strokeWidth="1.2" />
            <line x1="306" y1="100" x2="306" y2="260" stroke="#3a5164" strokeWidth="1" opacity="0.7" />
          </g>
          {/* 空调 */}
          <g>
            <rect x="220" y="34" width="100" height="28" rx="5" fill="#1f2c3a" stroke="#3c5164" strokeWidth="2" />
            <rect x="228" y="54" width="84" height="4" rx="2" fill="#0a1016" />
            <g
              stroke="#57e0b0"
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: bedroomAc.on ? 0.85 : 0, transition: "opacity .6s" }}
            >
              <path className="airflow" d="M236 66 q 9 20 0 38" />
              <path className="airflow" d="M258 66 q 9 25 0 46" />
              <path className="airflow" d="M280 66 q 9 20 0 38" />
              <path className="airflow" d="M302 66 q 9 25 0 46" />
            </g>
            {bedroomAc.on ? (
              <text className="plan-val" x="270" y="53" textAnchor="middle" fill="#57e0b0">
                {bedroomAc.target}°
              </text>
            ) : null}
          </g>
          {/* 主灯 */}
          <g>
            <circle cx="296" cy="304" r="34" fill="none" stroke="#2b3d4f" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="296" cy="304" r="15" fill="#1c2733" stroke="#46607a" strokeWidth="2" />
            <circle
              cx="296"
              cy="304"
              r="8"
              fill={bedroomLight.on ? "#ffd79a" : "#3a4652"}
              style={{ transition: "fill .4s" }}
            />
            {bedroomLight.on ? (
              <circle cx="296" cy="304" r="23" fill="#ffcf87" opacity={0.1 + glowOf(bedroomLight) * 0.22} />
            ) : null}
          </g>
        </g>

        {/* ================= 书房 ================= */}
        <g>
          <ellipse
            cx="452"
            cy="136"
            rx="86"
            ry="66"
            fill="url(#pool)"
            style={{ opacity: glowOf(studyLamp), transition: "opacity .8s" }}
          />
          {/* 书架 */}
          <g>
            <rect x="370" y="120" width="34" height="220" rx="3" fill="#1f2d3b" stroke="#3d5568" strokeWidth="1.6" />
            <g stroke="#3a5164" strokeWidth="1">
              <line x1="370" y1="160" x2="404" y2="160" />
              <line x1="370" y1="200" x2="404" y2="200" />
              <line x1="370" y1="240" x2="404" y2="240" />
              <line x1="370" y1="280" x2="404" y2="280" />
            </g>
          </g>
          {/* 书桌 + 椅子 */}
          <rect x="420" y="96" width="240" height="68" rx="4" fill="#1b2836" stroke="#3d5568" strokeWidth="2" />
          <circle cx="540" cy="208" r="26" fill="#1f2d3b" stroke="#3d5568" strokeWidth="1.8" />
          <path d="M516 196 a 26 26 0 0 1 48 0" fill="none" stroke="#3a5164" strokeWidth="2" />
          {/* 台灯 */}
          <g>
            <circle cx="452" cy="130" r="26" fill="none" stroke="#2b3d4f" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="452" cy="130" r="12" fill="#1c2733" stroke="#46607a" strokeWidth="2" />
            <circle
              cx="452"
              cy="130"
              r="6"
              fill={studyLamp.on ? "#ffd79a" : "#3a4652"}
              style={{ transition: "fill .4s" }}
            />
            {studyLamp.on ? (
              <circle cx="452" cy="130" r="19" fill="#ffcf87" opacity={0.1 + glowOf(studyLamp) * 0.24} />
            ) : null}
          </g>
          {/* 空调（贴右墙，竖向） */}
          <g>
            <rect x="664" y="200" width="32" height="100" rx="5" fill="#1c2733" stroke="#3c5164" strokeWidth="2" />
            <rect x="668" y="208" width="4" height="84" rx="2" fill="#0a1016" />
            <g
              stroke="#57e0b0"
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: studyAc.on ? 0.85 : 0, transition: "opacity .6s" }}
            >
              <path className="airflow" d="M658 220 q -20 8 -38 0" />
              <path className="airflow" d="M658 246 q -26 8 -48 0" />
              <path className="airflow" d="M658 272 q -20 8 -38 0" />
            </g>
            {studyAc.on ? (
              <text
                className="plan-val"
                x="686"
                y="250"
                textAnchor="middle"
                fill="#57e0b0"
                transform="rotate(-90 686 250)"
              >
                {studyAc.target}°
              </text>
            ) : null}
          </g>
        </g>

        {/* ================= 浴室 ================= */}
        <g>
          <ellipse
            cx="766"
            cy="140"
            rx="82"
            ry="66"
            fill="url(#pool)"
            style={{ opacity: glowOf(bathLight), transition: "opacity .8s" }}
          />
          <ellipse
            cx="829"
            cy="240"
            rx="132"
            ry="102"
            fill="url(#heat)"
            style={{ opacity: bathHeater.on ? 0.5 + gearOf(bathHeater) * 0.16 : 0, transition: "opacity .8s" }}
          />
          {/* 浴缸 */}
          <g>
            <rect x="720" y="290" width="208" height="74" rx="9" fill="#101a22" stroke="#3d5568" strokeWidth="2" />
            <rect x="730" y="299" width="188" height="56" rx="6" fill="#0b141b" stroke="#1d2b36" strokeWidth="1.2" />
            <circle cx="908" cy="327" r="5" fill="#2b3a48" />
          </g>
          {/* 洗手台 + 镜子 + 镜前灯 */}
          <g>
            <rect x="726" y="96" width="96" height="84" rx="5" fill="#1b2836" stroke="#3d5568" strokeWidth="1.8" />
            <ellipse cx="774" cy="138" rx="30" ry="21" fill="#0b141b" stroke="#31485a" strokeWidth="1.4" />
            <rect x="770" y="100" width="8" height="10" rx="2" fill="#33465a" />
            <rect x="704" y="96" width="7" height="84" fill="url(#mirror)" opacity="0.85" />
            <rect x="715" y="100" width="5" height="76" rx="2" fill="#1c2733" stroke="#46607a" strokeWidth="1" />
            {[112, 138, 164].map((y) => (
              <circle
                key={y}
                cx="717.5"
                cy={y}
                r="4.6"
                fill={bathLight.on ? "#ffe1ad" : "#3a4652"}
                style={{ transition: "fill .4s" }}
              />
            ))}
          </g>
          {/* 马桶 */}
          <g>
            <rect x="900" y="96" width="62" height="26" rx="3" fill="#1f2d3b" stroke="#3d5568" strokeWidth="1.6" />
            <ellipse cx="930" cy="156" rx="26" ry="30" fill="#1b2836" stroke="#3d5568" strokeWidth="1.8" />
            <ellipse cx="930" cy="156" rx="16" ry="20" fill="#0b141b" stroke="#31485a" strokeWidth="1.2" />
          </g>
          {/* 浴霸 */}
          <g>
            <rect x="800" y="200" width="58" height="58" rx="4" fill="#1c2733" stroke="#46607a" strokeWidth="2" />
            <g stroke="#3c5164" strokeWidth="1">
              <line x1="806" y1="206" x2="852" y2="206" />
              <line x1="806" y1="252" x2="852" y2="252" />
            </g>
            <circle cx="829" cy="228" r="16" fill="#101820" stroke="#4a6172" strokeWidth="1.4" />
            <Blades cx={829} cy={228} r={15} speed={gearOf(bathHeater)} />
            {bathHeater.on ? (
              <text className="plan-val" x="829" y="251" textAnchor="middle" fill="#ffb454">
                {bathHeater.level} 档
              </text>
            ) : null}
          </g>
          {/* 排气扇 */}
          <g>
            <circle cx="970" cy="240" r="24" fill="#101820" stroke="#3c5164" strokeWidth="2" />
            <circle cx="970" cy="240" r="18" fill="#0b1219" />
            <Blades cx={970} cy={240} r={17} speed={bathFan.on ? 1.8 : 0} />
            <g
              stroke="#8fd0ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: bathFan.on ? 0.7 : 0, transition: "opacity .6s" }}
            >
              <path className="airflow" d="M990 224 q 12 -8 18 -2" />
              <path className="airflow" d="M992 240 q 12 2 16 10" />
            </g>
          </g>
        </g>

        {/* ================= 客厅 ================= */}
        <g>
          <ellipse
            cx="345"
            cy="482"
            rx="154"
            ry="88"
            fill="url(#screenGlow)"
            style={{ opacity: livingTv.on ? 0.95 : 0, transition: "opacity .7s" }}
          />
          <ellipse
            cx="330"
            cy="512"
            rx="160"
            ry="96"
            fill="url(#pool)"
            style={{ opacity: glowOf(livingLight), transition: "opacity .8s" }}
          />
          {/* 地毯 + 茶几 */}
          <rect x="220" y="452" width="240" height="120" rx="9" fill="#16222c" stroke="#1a2732" strokeWidth="1.6" />
          <rect x="300" y="480" width="96" height="60" rx="4" fill="#3a2f26" stroke="#4a3b2e" strokeWidth="1.6" />
          <line x1="300" y1="504" x2="396" y2="504" stroke="#4a3b2e" strokeWidth="1" opacity="0.6" />
          {/* 沙发（面朝上方的电视） */}
          <g>
            <rect x="226" y="540" width="260" height="76" rx="10" fill="#202e3c" stroke="#3d5568" strokeWidth="2" />
            <rect x="226" y="592" width="260" height="24" rx="8" fill="#243240" />
            <rect x="240" y="550" width="112" height="38" rx="7" fill="#2a3a49" />
            <rect x="360" y="550" width="112" height="38" rx="7" fill="#2a3a49" />
            <rect x="226" y="540" width="14" height="76" rx="6" fill="#243240" />
            <rect x="472" y="540" width="14" height="76" rx="6" fill="#243240" />
          </g>
          {/* 电视柜 + 屏幕 */}
          <g>
            <rect x="230" y="394" width="230" height="32" rx="3" fill="#18242f" stroke="#3d5568" strokeWidth="2" />
            <rect
              x="238"
              y="400"
              width="214"
              height="20"
              rx="1.5"
              fill={livingTv.on ? "url(#screenGrad)" : "#121d27"}
              style={{ transition: "fill .4s" }}
            />
            {livingTv.on ? (
              <>
                <rect x="252" y="406" width="92" height="4" rx="2" fill="#0a1218" opacity="0.55" />
                <rect x="356" y="406" width="38" height="4" rx="2" fill="#0a1218" opacity="0.35" />
                <circle cx="444" cy="403" r="2.4" fill="#ffb454" />
              </>
            ) : null}
          </g>
          {/* 主灯 */}
          <g>
            <circle cx="330" cy="508" r="36" fill="none" stroke="#2b3d4f" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="330" cy="508" r="15" fill="#1c2733" stroke="#46607a" strokeWidth="2" />
            <circle
              cx="330"
              cy="508"
              r="8"
              fill={livingLight.on ? "#ffd79a" : "#3a4652"}
              style={{ transition: "fill .4s" }}
            />
            {livingLight.on ? (
              <circle cx="330" cy="508" r="23" fill="#ffcf87" opacity={0.1 + glowOf(livingLight) * 0.22} />
            ) : null}
          </g>
          {/* 窗 + 窗帘：左外墙上一段窗洞，两片帘子按开合比例收放 */}
          <g>
            {/* 窗框 */}
            <rect x="24" y="430" width="9" height="190" fill="url(#sky)" />
            <rect x="24" y="430" width="9" height="190" fill="none" stroke="#456075" strokeWidth="1.4" />
            <line x1="24" y1="525" x2="33" y2="525" stroke="#456075" strokeWidth="1.2" />
            <line x1="22" y1="430" x2="40" y2="430" stroke="#4e6b83" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="22" y1="620" x2="40" y2="620" stroke="#4e6b83" strokeWidth="2.4" strokeLinecap="round" />
            {/* 窗外的一点夜色，随帘子开合变亮 */}
            <rect
              x="26"
              y="432"
              width="4"
              height="186"
              fill="#9fd8ff"
              style={{ opacity: 0.06 + curtainOpen * 0.2, transition: "opacity .6s" }}
            />
            {/* 两片窗帘 */}
            <rect
              x="36"
              y="430"
              width="23"
              height={panelH}
              rx="2"
              fill="#37505f"
              stroke="#5b7c95"
              strokeWidth="1.3"
              style={{ transition: "height .55s ease, y .55s ease" }}
            />
            <rect
              x="36"
              y={620 - panelH}
              width="23"
              height={panelH}
              rx="2"
              fill="#37505f"
              stroke="#5b7c95"
              strokeWidth="1.3"
              style={{ transition: "height .55s ease, y .55s ease" }}
            />
            {/* 窗帘杆 */}
            <line x1="35" y1="426" x2="35" y2="624" stroke="#5b7c95" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>

        {/* ================= 厨房 ================= */}
        <g>
          <ellipse
            cx={830}
            cy="500"
            rx="112"
            ry="86"
            fill="url(#pool)"
            style={{ opacity: glowOf(kitchenLight), transition: "opacity .8s" }}
          />
          <ellipse
            cx="696"
            cy="626"
            rx="86"
            ry="66"
            fill="url(#coolGlow)"
            style={{ opacity: kitchenFridge.on ? 1 : 0, transition: "opacity .8s" }}
          />
          {/* 操作台 */}
          <rect x="930" y="456" width="78" height="208" rx="4" fill="#1b2836" stroke="#3d5568" strokeWidth="2" />
          {/* 灶台 */}
          <g>
            <rect x="936" y="528" width="66" height="72" rx="3" fill="#131c25" stroke="#3d5568" strokeWidth="1.4" />
            <circle cx="969" cy="548" r="12" fill="#0b1219" stroke="#3c5164" strokeWidth="1.4" />
            <circle cx="969" cy="582" r="12" fill="#0b1219" stroke="#3c5164" strokeWidth="1.4" />
          </g>
          {/* 水槽 */}
          <g>
            <rect x="940" y="614" width="60" height="40" rx="4" fill="#0b1219" stroke="#31485a" strokeWidth="1.4" />
            <rect x="948" y="622" width="44" height="24" rx="3" fill="#101a22" stroke="#3c5164" strokeWidth="1" />
            <circle cx="970" cy="634" r="4" fill="#2b3a48" />
          </g>
          {/* 油烟机 */}
          <g>
            <rect x="932" y="470" width="74" height="54" rx="4" fill="#1c2733" stroke="#46607a" strokeWidth="2" />
            <circle cx="969" cy="497" r="18" fill="#101820" stroke="#4a6172" strokeWidth="1.4" />
            <Blades cx={969} cy={497} r={17} speed={gearOf(kitchenHood)} />
            <g
              stroke="#ffb454"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: kitchenHood.on ? 0.35 + kitchenHood.level * 0.18 : 0, transition: "opacity .6s" }}
            >
              <path className="airflow" d="M948 530 q -14 14 -30 18" />
              <path className="airflow" d="M969 532 q 0 16 -6 26" />
              <path className="airflow" d="M990 530 q 12 14 24 20" />
            </g>
            {kitchenHood.on ? (
              <text className="plan-val" x="969" y="519" textAnchor="middle" fill="#ffb454">
                {kitchenHood.level} 档
              </text>
            ) : null}
          </g>
          {/* 冰箱 */}
          <g>
            <rect
              x="656"
              y="590"
              width="80"
              height="74"
              rx="4"
              fill="#1f2d3b"
              stroke={kitchenFridge.on ? "#3d6c7a" : "#26333f"}
              strokeWidth="2"
              style={{ transition: "stroke .5s" }}
            />
            <line x1="656" y1="614" x2="736" y2="614" stroke="#3a5164" strokeWidth="1.2" />
            <rect x="722" y="620" width="4" height="28" rx="2" fill="#33465a" />
            <circle
              cx="664"
              cy="600"
              r="3"
              fill={kitchenFridge.on ? "#6fe3c0" : "#3a4652"}
              style={{ transition: "fill .4s" }}
            />
          </g>
          {/* 吊灯 */}
          <g>
            <circle cx="830" cy="500" r="34" fill="none" stroke="#2b3d4f" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="830" cy="500" r="14" fill="#1c2733" stroke="#46607a" strokeWidth="2" />
            <circle
              cx="830"
              cy="500"
              r="7"
              fill={kitchenLight.on ? "#ffd79a" : "#3a4652"}
              style={{ transition: "fill .4s" }}
            />
            {kitchenLight.on ? (
              <circle cx="830" cy="500" r="21" fill="#ffcf87" opacity={0.1 + glowOf(kitchenLight) * 0.22} />
            ) : null}
          </g>
        </g>

        {/* ---------- 房间名 + 实时功率 ---------- */}
        <g>
          <text className="plan-room" x="44" y="62">
            主卧
            <tspan className="plan-w" dx="10" fill={roomW("bedroom") > 0 ? "#57e0b0" : "#8299ab"}>
              BEDROOM · {roomW("bedroom")} W
            </tspan>
          </text>

          <text className="plan-room" x="376" y="62">
            书房
            <tspan className="plan-w" dx="10" fill={roomW("study") > 0 ? "#57e0b0" : "#8299ab"}>
              STUDY · {roomW("study")} W
            </tspan>
          </text>

          <text className="plan-room" x="716" y="62">
            浴室
            <tspan className="plan-w" dx="10" fill={roomW("bathroom") > 0 ? "#57e0b0" : "#8299ab"}>
              BATH · {roomW("bathroom")} W
            </tspan>
          </text>

          <text className="plan-room" x="44" y="424">
            客厅
            <tspan className="plan-w" dx="10" fill={roomW("living") > 0 ? "#57e0b0" : "#8299ab"}>
              LIVING · {roomW("living")} W
            </tspan>
          </text>

          <text className="plan-room" x="656" y="424">
            厨房
            <tspan className="plan-w" dx="10" fill={roomW("kitchen") > 0 ? "#57e0b0" : "#8299ab"}>
              KITCHEN · {roomW("kitchen")} W
            </tspan>
          </text>
        </g>

        {/* ---------- 点击热区 ---------- */}
        <g className="hits">
          {/* 客厅 */}
          <rect className="hit" fill="transparent" x="222" y="390" width="246" height="62" rx="4" onClick={() => onPick("living.tv")}>
            <title>客厅 · 电视（点击开关）</title>
          </rect>
          <rect className="hit" fill="transparent" x="272" y="462" width="116" height="92" rx="4" onClick={() => onPick("living.light")}>
            <title>客厅 · 主灯（点击开关）</title>
          </rect>
          <rect
            className="hit"
            fill="transparent"
            x="16"
            y="426"
            width="56"
            height="204"
            rx="4"
            onClick={() => onPick("living.curtain")}
          >
            <title>客厅 · 窗帘（点击开合）</title>
          </rect>

          {/* 主卧 */}
          <rect className="hit" fill="transparent" x="212" y="26" width="116" height="94" rx="4" onClick={() => onPick("bedroom.ac")}>
            <title>主卧 · 空调（点击开关）</title>
          </rect>
          <rect className="hit" fill="transparent" x="240" y="256" width="112" height="104" rx="4" onClick={() => onPick("bedroom.light")}>
            <title>主卧 · 主灯（点击开关）</title>
          </rect>

          {/* 书房 */}
          <rect className="hit" fill="transparent" x="412" y="98" width="82" height="68" rx="4" onClick={() => onPick("study.lamp")}>
            <title>书房 · 台灯（点击开关）</title>
          </rect>
          <rect className="hit" fill="transparent" x="650" y="190" width="54" height="118" rx="4" onClick={() => onPick("study.ac")}>
            <title>书房 · 空调（点击开关）</title>
          </rect>

          {/* 厨房 */}
          <rect
            className="hit"
            fill="transparent"
            x="776"
            y="456"
            width="108"
            height="92"
            rx="4"
            onClick={() => onPick("kitchen.light")}
          >
            <title>厨房 · 吊灯（点击开关）</title>
          </rect>
          <rect className="hit" fill="transparent" x="924" y="462" width="88" height="72" rx="4" onClick={() => onPick("kitchen.hood")}>
            <title>厨房 · 油烟机（点击开关）</title>
          </rect>
          <rect
            className="hit"
            fill="transparent"
            x="646"
            y="580"
            width="100"
            height="94"
            rx="4"
            onClick={() => onPick("kitchen.fridge")}
          >
            <title>厨房 · 冰箱（点击开关）</title>
          </rect>

          {/* 浴室 */}
          <rect
            className="hit"
            fill="transparent"
            x="698"
            y="86"
            width="52"
            height="102"
            rx="4"
            onClick={() => onPick("bathroom.light")}
          >
            <title>浴室 · 镜前灯（点击开关）</title>
          </rect>
          <rect
            className="hit"
            fill="transparent"
            x="792"
            y="190"
            width="76"
            height="94"
            rx="4"
            onClick={() => onPick("bathroom.heater")}
          >
            <title>浴室 · 浴霸（点击开关）</title>
          </rect>
          <rect className="hit" fill="transparent" x="944" y="212" width="56" height="58" rx="4" onClick={() => onPick("bathroom.fan")}>
            <title>浴室 · 排气扇（点击开关）</title>
          </rect>
        </g>
      </svg>
    </div>
  );
}
