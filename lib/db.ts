import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Action, CommandRecord, PlanEngine } from "./types";

/** node:sqlite 在部分 Node 运行时（例如没开实验开关的 Node 22）不存在，加载失败就降级成"没有历史" */
type SqliteStatement = { all: (...params: unknown[]) => unknown[]; run: (...params: unknown[]) => unknown };
type SqliteDatabase = { exec: (sql: string) => void; prepare: (sql: string) => SqliteStatement };
type SqliteModule = { DatabaseSync: new (file: string) => SqliteDatabase };

function loadSqlite(): SqliteModule | null {
  try {
    return require("node:sqlite") as SqliteModule;
  } catch (error) {
    console.error("[zhangdeng] node:sqlite unavailable", error instanceof Error ? error.message : error);
    return null;
  }
}

/** 部署到云端时本地目录是只读的，只能写 /tmp；本机开发仍然写 data/ */
function resolveDbFile(): string {
  if (process.env.ZHANGDENG_DB) return process.env.ZHANGDENG_DB;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "zhangdeng.db");
  }
  return path.join(process.cwd(), "data", "zhangdeng.db");
}

const DB_FILE = resolveDbFile();

interface DbHandle {
  db: SqliteDatabase;
}

const globalStore = globalThis as unknown as { __zhangdengDb?: DbHandle | null };

/** 懒加载 + 全局缓存；打不开就返回 null，页面照常能用，只是没有历史记录 */
function connect(): DbHandle | null {
  if (globalStore.__zhangdengDb !== undefined) return globalStore.__zhangdengDb;

  const sqlite = loadSqlite();
  if (!sqlite) {
    globalStore.__zhangdengDb = null;
    return null;
  }

  // 先试配置的路径，失败（比如只读文件系统）再退到临时目录
  for (const file of [DB_FILE, path.join(os.tmpdir(), "zhangdeng.db")]) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const db = new sqlite.DatabaseSync(file);
      db.exec(`
        CREATE TABLE IF NOT EXISTS commands (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          text TEXT NOT NULL,
          reply TEXT NOT NULL,
          engine TEXT NOT NULL,
          actions TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_commands_created ON commands (created_at DESC);
      `);
      globalStore.__zhangdengDb = { db };
      return globalStore.__zhangdengDb;
    } catch (error) {
      console.error("[zhangdeng] db init failed at", file, error instanceof Error ? error.message : error);
    }
  }

  globalStore.__zhangdengDb = null;
  return null;
}

export function newCommandId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function saveCommand(input: {
  id: string;
  text: string;
  reply: string;
  engine: PlanEngine;
  actions: Action[];
}): boolean {
  const handle = connect();
  if (!handle) return false;
  try {
    handle.db
      .prepare(
        `INSERT INTO commands (id, created_at, text, reply, engine, actions)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        new Date().toISOString(),
        input.text,
        input.reply,
        input.engine,
        JSON.stringify(input.actions),
      );
    return true;
  } catch (error) {
    console.error("[zhangdeng] db write failed", error instanceof Error ? error.message : error);
    return false;
  }
}

export function listCommands(limit = 12): CommandRecord[] {
  const handle = connect();
  if (!handle) return [];
  try {
    const rows = handle.db
      .prepare(
        `SELECT id, created_at, text, reply, engine, actions
         FROM commands ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit) as {
      id: string;
      created_at: string;
      text: string;
      reply: string;
      engine: string;
      actions: string;
    }[];

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      text: row.text,
      reply: row.reply,
      engine: row.engine === "llm" ? "llm" : "local",
      actions: JSON.parse(row.actions) as Action[],
    }));
  } catch (error) {
    console.error("[zhangdeng] db read failed", error instanceof Error ? error.message : error);
    return [];
  }
}
