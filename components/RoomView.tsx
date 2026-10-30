"use client";

import type { DeviceId, DeviceState } from "@/lib/types";

interface RoomViewProps {
  devices: DeviceState[];
  clock: number;
  onPick: (id: DeviceId) => void;
}

/**
 * 一间画出来的屋子，也是唯一的主视觉。
 * 每个设备的「开着」都直接画在画面上：灯有光锥、窗帘真的开合、风扇真的转。
 */
export default function RoomView({ devices, clock, onPick }: RoomViewProps) {
  const get = (id: DeviceId): DeviceState =>
    devices.find((d) => d.id === id) ?? { id, on: false, level: 0, target: 26 };

  const ceiling = get("light.ceiling");
  const lamp = get("lamp.floor");
  const tv = get("tv");
  const fan = get("fan");
  const ac = get("ac");
  const curtain = get("curtain");

  const ceilingGlow = ceiling.on ? 0.3 + (ceiling.level / 100) * 0.7 : 0;
  const lampGlow = lamp.on ? 0.25 + (lamp.level / 100) * 0.75 : 0;
  const curtainOpen = curtain.level / 100;
  const fanSpeed = fan.on ? fan.level : 0;
  const hour = Math.floor(clock / 60);
  const evening = hour >= 18 || hour < 6;

  return (
    <div className="room">
      <svg viewBox="0 0 900 560" role="img" aria-label="房间示意图，点击任意设备可以开关">
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#182430" />
            <stop offset="1" stopColor="#0d141b" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d1319" />
            <stop offset="1" stopColor="#080c11" />
          </linearGradient>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={evening ? "#0a1828" : "#123048"} />
            <stop offset="1" stopColor={evening ? "#12283c" : "#2a5670"} />
          </linearGradient>
          <radialGradient id="moon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f6edd2" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#f6edd2" stopOpacity="0.25" />
            <stop offset="1" stopColor="#f6edd2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cone" cx="0.5" cy="0" r="0.95">
            <stop offset="0" stopColor="#ffcf87" stopOpacity="0.34" />
            <stop offset="0.55" stopColor="#ffcf87" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ffcf87" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffc46b" stopOpacity="0.34" />
            <stop offset="1" stopColor="#ffc46b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tvGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#8fd0ff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#8fd0ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="moonBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfe4ff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#cfe4ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tvScreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3f8fb5" />
            <stop offset="1" stopColor="#1b3f57" />
          </linearGradient>
        </defs>

        {/* 墙与地板 */}
        <rect width="900" height="402" fill="url(#wall)" />
        <rect y="402" width="900" height="158" fill="url(#floor)" />
        <line x1="0" y1="402" x2="900" y2="402" stroke="#1d2a36" strokeWidth="2" />
        <line x1="0" y1="418" x2="900" y2="418" stroke="#141d26" strokeWidth="1" />
        <g stroke="#131b23" strokeWidth="1">
          <line x1="120" y1="560" x2="330" y2="402" />
          <line x1="420" y1="560" x2="470" y2="402" />
          <line x1="720" y1="560" x2="620" y2="402" />
        </g>

        {/* 窗外的月光 */}
        <polygon
          points="556,268 834,268 748,470 470,470"
          fill="url(#moonBeam)"
          style={{ opacity: 0.75 - curtainOpen * 0.55, transition: "opacity .8s" }}
        />

        {/* 窗户 + 窗帘 */}
        <g>
          <rect x="556" y="92" width="278" height="176" rx="2" fill="url(#sky)" stroke="#243342" strokeWidth="6" />
          <circle cx="706" cy="150" r="34" fill="url(#moon)" />
          <g fill="#dfe9f5" opacity="0.7">
            <circle cx="600" cy="120" r="1.6" />
            <circle cx="640" cy="108" r="1.2" />
            <circle cx="782" cy="128" r="1.4" />
            <circle cx="762" cy="220" r="1.2" />
            <circle cx="618" cy="232" r="1.4" />
          </g>
          <line x1="695" y1="92" x2="695" y2="268" stroke="#243342" strokeWidth="4" />
          <line x1="556" y1="180" x2="834" y2="180" stroke="#243342" strokeWidth="3" />
          <rect x="528" y="84" width="334" height="5" rx="2.5" fill="#2c3a48" />
          {/* 窗帘：左右各一片，scaleX 表示拉开多少 */}
          <g style={{ transition: "transform .8s cubic-bezier(.4,0,.2,1)" }}>
            <rect
              x="534"
              y="90"
              width="118"
              height="182"
              rx="3"
              fill="#231a16"
              stroke="#2f221c"
              style={{ transform: `scaleX(${1 - curtainOpen * 0.86})`, transformOrigin: "534px 90px" }}
            />
            <rect
              x="738"
              y="90"
              width="118"
              height="182"
              rx="3"
              fill="#231a16"
              stroke="#2f221c"
              style={{ transform: `scaleX(${1 - curtainOpen * 0.86})`, transformOrigin: "856px 90px" }}
            />
          </g>
        </g>

        {/* 吊灯 */}
        <g>
          <line x1="430" y1="0" x2="430" y2="62" stroke="#26333f" strokeWidth="3" />
          <polygon points="386,62 474,62 458,104 402,104" fill="#2b3742" stroke="#3a4a58" strokeWidth="2" />
          <circle cx="430" cy="110" r="9" fill={ceilingGlow > 0 ? "#ffd79a" : "#3a4652"} />
          <polygon points="402,110 458,110 596,470 264,470" fill="url(#cone)" style={{ opacity: ceilingGlow, transition: "opacity .7s" }} />
          <ellipse cx="430" cy="470" rx="176" ry="46" fill="url(#pool)" style={{ opacity: ceilingGlow * 0.9, transition: "opacity .7s" }} />
        </g>

        {/* 电视 */}
        <g>
          <ellipse cx="175" cy="210" rx="150" ry="110" fill="url(#tvGlow)" style={{ opacity: tv.on ? 1 : 0, transition: "opacity .7s" }} />
          <rect x="60" y="146" width="232" height="132" rx="5" fill="#0b1219" stroke="#2a3745" strokeWidth="3" />
          <rect x="66" y="152" width="220" height="120" rx="2" fill={tv.on ? "url(#tvScreen)" : "#0e161f"} />
          {tv.on ? (
            <>
              <rect x="86" y="196" width="120" height="8" rx="4" fill="#dff1ff" opacity="0.75" />
              <rect x="86" y="216" width="74" height="6" rx="3" fill="#dff1ff" opacity="0.4" />
              <circle cx="250" cy="170" r="4" fill="#ffb454" opacity="0.9" />
            </>
          ) : (
            <polygon points="66,272 150,152 190,152 106,272" fill="#141d26" opacity="0.7" />
          )}
        </g>

        {/* 空调 */}
        <g>
          <rect x="330" y="56" width="150" height="42" rx="6" fill="#1c2733" stroke="#2c3b4a" strokeWidth="2" />
          <rect x="340" y="86" width="130" height="5" rx="2.5" fill="#101820" />
          <g stroke="#57e0b0" strokeWidth="2" strokeLinecap="round" fill="none" style={{ opacity: ac.on ? 0.85 : 0, transition: "opacity .6s" }}>
            <path className="airflow" d="M356 106 q 8 18 0 34" />
            <path className="airflow" d="M386 106 q 8 22 0 42" />
            <path className="airflow" d="M416 106 q 8 18 0 34" />
            <path className="airflow" d="M446 106 q 8 22 0 42" />
          </g>
          {ac.on && (
            <text x="408" y="82" textAnchor="middle" fill="#57e0b0" fontSize="11" fontFamily="ui-monospace, monospace">
              {ac.target}°
            </text>
          )}
        </g>

        {/* 沙发 */}
        <g>
          <rect x="238" y="362" width="382" height="66" rx="12" fill="#1b2632" stroke="#26333f" strokeWidth="2" />
          <rect x="252" y="376" width="164" height="42" rx="8" fill="#22303d" />
          <rect x="432" y="376" width="164" height="42" rx="8" fill="#22303d" />
          <rect x="238" y="424" width="382" height="34" rx="10" fill="#1d2936" stroke="#26333f" strokeWidth="2" />
          <rect x="252" y="362" width="18" height="56" rx="8" fill="#243441" />
          <rect x="588" y="362" width="18" height="56" rx="8" fill="#243441" />
        </g>

        {/* 地毯 + 茶几 */}
        <ellipse cx="470" cy="512" rx="286" ry="38" fill="#121c25" stroke="#1a2732" strokeWidth="1.5" />
        <g>
          <rect x="580" y="466" width="188" height="14" rx="4" fill="#3a2f26" stroke="#4a3b2e" strokeWidth="1.5" />
          <rect x="596" y="480" width="10" height="26" fill="#2c231c" />
          <rect x="742" y="480" width="10" height="26" fill="#2c231c" />
          <rect x="620" y="456" width="40" height="10" rx="2" fill="#24303c" />
          <circle cx="700" cy="458" r="7" fill="#24303c" />
        </g>

        {/* 落地灯 */}
        <g>
          <ellipse cx="812" cy="470" rx="86" ry="30" fill="url(#pool)" style={{ opacity: lampGlow * 0.8, transition: "opacity .7s" }} />
          <rect x="808" y="330" width="8" height="132" fill="#2b3743" />
          <ellipse cx="812" cy="464" rx="34" ry="8" fill="#222d38" />
          <polygon points="774,286 850,286 862,330 762,330" fill={lamp.on ? "#f0cd93" : "#2a3540"} stroke="#3b4a58" strokeWidth="2" />
          <circle cx="812" cy="338" r="8" fill={lamp.on ? "#ffe0ae" : "#3a4652"} />
        </g>

        {/* 吊扇 */}
        <g>
          <line x1="690" y1="0" x2="690" y2="34" stroke="#26333f" strokeWidth="2" />
          <circle cx="690" cy="40" r="7" fill="#2f3c49" />
          <g
            className="fan"
            style={{
              transformOrigin: "690px 40px",
              animationPlayState: fanSpeed > 0 ? "running" : "paused",
              animationDuration: `${2.6 - fanSpeed * 0.5}s`,
            }}
          >
            {[0, 72, 144, 216, 288].map((angle) => (
              <g key={angle} transform={`rotate(${angle} 690 40)`}>
                <path d="M690 40 q 34 -6 62 -2 q -4 12 -18 14 q -26 2 -44 -4 z" fill="#22303c" stroke="#2d3d4c" strokeWidth="1.5" />
              </g>
            ))}
          </g>
        </g>

        {/* 可点击区域（透明），鼠标悬停时高亮 */}
        <g className="hits">
          <rect className="hit" x="60" y="146" width="232" height="132" rx="6" onClick={() => onPick("tv")}>
            <title>电视</title>
          </rect>
          <rect className="hit" x="330" y="56" width="150" height="42" rx="6" onClick={() => onPick("ac")}>
            <title>空调</title>
          </rect>
          <rect className="hit" x="386" y="62" width="88" height="52" rx="4" onClick={() => onPick("light.ceiling")}>
            <title>主灯</title>
          </rect>
          <rect className="hit" x="762" y="286" width="100" height="52" rx="4" onClick={() => onPick("lamp.floor")}>
            <title>落地灯</title>
          </rect>
          <rect className="hit" x="630" y="0" width="120" height="80" rx="4" onClick={() => onPick("fan")}>
            <title>风扇</title>
          </rect>
          <rect className="hit" x="534" y="84" width="322" height="190" rx="4" onClick={() => onPick("curtain")}>
            <title>窗帘</title>
          </rect>
        </g>
      </svg>
    </div>
  );
}
