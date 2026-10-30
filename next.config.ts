import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 允许用局域网 IP 访问开发服务器（手机/其他电脑连同一个 WiFi 时用）
  allowedDevOrigins: ["192.168.5.3"],
};

export default nextConfig;
