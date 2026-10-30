import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "掌灯 ZhangDeng · 一句话之家",
  description:
    "对屋子说一句中文，它先听懂意图，再把这句意思拆成一条条设备指令，一台一台地动起来。本地规则引擎零配置可用，配上大模型走 LLM 解析，失败自动降级。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
