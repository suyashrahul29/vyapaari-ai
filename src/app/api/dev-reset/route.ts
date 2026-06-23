import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";

// Wipes the current user's Business Brain (profile + memories) from the DB.
// Used during demo testing to re-run the full first-time flow.
export async function POST(req: NextRequest) {
  // Destructive demo-only route — never expose in production.
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    await Promise.all([
      supabase.from("memories").delete().eq("user_id", userId),
      supabase.from("business_profile").delete().eq("user_id", userId),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/dev-reset]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
