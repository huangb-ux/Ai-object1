import { NextResponse } from "next/server";
import { listCommands } from "@/lib/db";
import { snapshot } from "@/lib/house";
import { getLlmConfig } from "@/lib/llm";
import { SCENES } from "@/lib/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const cfg = getLlmConfig();
  return NextResponse.json({
    state: snapshot(),
    history: listCommands(10),
    scenes: SCENES.map((scene) => ({ id: scene.id, name: scene.name, hint: scene.hint })),
    engine: cfg ? { mode: "llm", model: cfg.model } : { mode: "local", model: null },
  });
}
