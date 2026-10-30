import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 测试一律走本地规则引擎：清掉可能残留的 LLM 配置
delete process.env.LLM_API_KEY;
delete process.env.LLM_BASE_URL;
delete process.env.LLM_MODEL;

// 每个进程一个临时库，跑完就删，不污染开发数据
const dbFile = join(tmpdir(), `zhangdeng-test-${process.pid}.db`);
process.env.ZHANGDENG_DB = dbFile;

process.on("exit", () => {
  try {
    rmSync(dbFile, { force: true });
  } catch {
    // ignore
  }
});
