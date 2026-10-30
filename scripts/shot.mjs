// 用 CDP 驱动一个已有的 Edge 实例截图（Edge 需以 --remote-debugging-port=9222 启动）
import { writeFileSync } from "node:fs";

const [url, out, widthArg, heightArg] = process.argv.slice(2);
const width = Number(widthArg ?? 1440);
const height = Number(heightArg ?? 1100);

const version = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
});
await new Promise((resolve) => ws.addEventListener("open", resolve));
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
await send("Page.navigate", { url }, sessionId);

for (let i = 0; i < 80; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const { result } = await send(
    "Runtime.evaluate",
    { expression: "document.readyState + '|' + document.body.innerText.length", returnByValue: true },
    sessionId,
  );
  const [ready, length] = String(result.value).split("|");
  if (ready === "complete" && Number(length) > 400) break;
}

// 第五个参数 demo：点一下「我回家了」示例，让截图里带上解析结果
if (process.argv[6] === "demo") {
  await send(
    "Runtime.evaluate",
    {
      expression:
        "(() => { const chip = [...document.querySelectorAll('.ex-chip')].find((el) => el.textContent.includes('我回家了')); if (chip) chip.click(); return Boolean(chip); })()",
      returnByValue: true,
    },
    sessionId,
  );
  await new Promise((resolve) => setTimeout(resolve, 3200));
}

const metrics = await send("Page.getLayoutMetrics", {}, sessionId);
const fullHeight = Math.ceil(metrics.cssContentSize?.height ?? height);
await send("Emulation.setDeviceMetricsOverride", { width, height: fullHeight, deviceScaleFactor: 1, mobile: false }, sessionId);
await new Promise((resolve) => setTimeout(resolve, 400));

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
writeFileSync(out, Buffer.from(shot.data, "base64"));
await send("Target.closeTarget", { targetId });
ws.close();
console.log(`saved ${out} ${width}x${fullHeight}`);
