#!/usr/bin/env bash
# 在全新的 Linux 服务器上跑这一个脚本，就把掌灯部署起来（Ubuntu/Debian 系）
# 用法：
#   bash scripts/deploy.sh                 # 只监听 80 端口，用 IP 访问
#   DOMAIN=1.2.3.4.sslip.io bash scripts/deploy.sh   # 自动申请 HTTPS 证书
set -euo pipefail

DOMAIN="${DOMAIN:-}"

echo "==> 1/5 检查 Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "    未安装 Docker，开始安装（官方脚本，约 1 分钟）"
  curl -fsSL https://get.docker.com | sh
else
  echo "    已安装：$(docker --version)"
fi

echo "==> 2/5 检查 Docker Compose 插件"
if ! docker compose version >/dev/null 2>&1; then
  echo "    安装 compose 插件"
  apt-get update -y && apt-get install -y docker-compose-plugin
fi

echo "==> 3/5 准备数据目录与端口"
mkdir -p data
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi

echo "==> 4/5 构建并启动"
if [ -n "$DOMAIN" ]; then
  echo "    对外域名：$DOMAIN（Caddy 会自动申请 HTTPS 证书）"
  DOMAIN="$DOMAIN" docker compose up -d --build
else
  echo "    未指定 DOMAIN，将用 http://<服务器IP> 访问"
  docker compose up -d --build
fi

echo "==> 5/5 健康检查"
sleep 6
docker compose ps
PORT_SUFFIX=""
if [ -n "$DOMAIN" ]; then PORT_SUFFIX=""; fi
echo
echo "完成。访问：${DOMAIN:+https://$DOMAIN}${DOMAIN:-http://<服务器IP>}"
echo "查看日志：docker compose logs -f app"
