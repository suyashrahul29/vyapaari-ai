import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm";
import { getProfile, recentMemories } from "@/lib/brain";
import { buildInsightPrompt } from "@/lib/prompts";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { language = "hindi" } = await req.json().catch(() => ({}));

    const [profile, mems] = await Promise.all([
      getProfile(userId),
      recentMemories(userId, 12),
    ]);

    const block = [
      `PROFILE:\n${JSON.stringify(profile, null, 2)}`,
      ``,
      `RECENT MEMORIES:\n${mems.map((m) => `- ${m.text}`).join("\n")}`,
    ].join("\n");

    const alert = await chat(buildInsightPrompt(language), block, {
      temperature: 0.5,
    });
    return NextResponse.json({ alert: alert.trim() });
  } catch (err: any) {
    console.error("[/api/insight]", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
