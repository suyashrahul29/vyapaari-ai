import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// Single source of truth for "who is calling". Verifies the caller's Supabase
// session (a Bearer access token issued by the browser login) server-side and
// returns the authenticated user id. Never trust a userId supplied in the
// request body/query — derive it from the verified token only.
//
// Uses the public anon key (not the service-role key): anon is enough to call
// auth.getUser(token), which validates the JWT against Supabase Auth.
let _verifier: SupabaseClient | null = null;

function verifier(): SupabaseClient {
  if (_verifier) return _verifier;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase auth env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }
  _verifier = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _verifier;
}

export async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) return null;
  try {
    const { data, error } = await verifier().auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
