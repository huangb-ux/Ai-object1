# 掌灯 · 生产镜像：Node 24 + pnpm，构建后跑 next start
FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm i -g pnpm@11.17.0 && apk add --no-cache libc6-compat

# 先装依赖，利用 Docker 层缓存
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 再拷贝源码构建
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 运行时只保留必要文件
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
RUN mkdir -p /data
ENV ZHANGDENG_DB=/data/zhangdeng.db
EXPOSE 3100
CMD ["pnpm", "start"]
