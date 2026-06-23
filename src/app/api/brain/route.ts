import { NextRequest, NextResponse } from "next/server";
import { getProfile, recentMemories } from "@/lib/brain";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Feeds the live Business Brain panel.
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const [profile, memories] = await Promise.all([
      getProfile(userId),
      recentMemories(userId, 10),
    ]);
    return NextResponse.json({ profile, memories });
  } catch (err: any) {
    console.error("[/api/brain]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
