import { NextRequest, NextResponse } from "next/server";
import { setOnboardingDone } from "@/lib/brain";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { language = "hindi" } = await req.json().catch(() => ({}));
    await setOnboardingDone(userId, language);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/onboarding-done]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
