import { NextRequest, NextResponse } from "next/server";
import { runTurn, runProfilerForUser } from "@/lib/graph";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { text, language = "hindi", history = [] } = await req.json().catch(() => ({}));
    if (!text?.trim()) {
      return NextResponse.json({ error: "empty text" }, { status: 400 });
    }
    const turns = (Array.isArray(history) ? history : ([] as Array<{ role: string; text: string }>))
      .slice(-6)
      .map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }));
    const out = await runTurn(userId, text.trim(), language, turns);
    // Profiler runs in background — doesn't block the reply.
    runProfilerForUser(userId, text.trim()).catch((e) => console.error("[profiler bg]", e));
    return NextResponse.json(out);
  } catch (err: any) {
    console.error("[/api/turn]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
