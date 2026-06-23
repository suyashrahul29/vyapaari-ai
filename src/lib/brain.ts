import { supabase } from "./supabase";
import { embed } from "./embeddings";
import type { BusinessProfile, Customer, ExtractedFacts, MemoryHit } from "./types";

// ---------- Structured memory ----------

export async function getProfile(userId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from("business_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    loans: data.loans ?? [],
    customers: data.customers ?? [],
  } as BusinessProfile;
}

export async function upsertProfile(p: BusinessProfile): Promise<void> {
  const { error } = await supabase
    .from("business_profile")
    .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

// Fields the profiler is allowed to write back. Anything else (esp. user_id/id
// or unknown keys) is dropped so a hallucinated patch can't corrupt the row.
const PROFILE_PATCH_KEYS = [
  "owner_name",
  "business_type",
  "city",
  "turnover",
  "margin_pct",
  "cash_on_hand",
  "peak_season",
  "supplier_terms",
  "discount_policy",
  "main_challenge",
  "main_goal",
] as const;

// Merge a customer into the profile by name (overwrite current state, §8.5).
function mergeCustomers(existing: Customer[], incoming: Customer[]): Customer[] {
  const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c]));
  for (const c of incoming) {
    if (!c?.name?.trim()) continue; // skip malformed extractions (no name)
    byName.set(c.name.toLowerCase(), c);
  }
  return [...byName.values()];
}

export async function applyExtractedFacts(
  userId: string,
  facts: ExtractedFacts
): Promise<BusinessProfile | null> {
  const profile = (await getProfile(userId)) ?? {
    user_id: userId,
    loans: [],
    customers: [],
  };

  if (facts.profilePatch) {
    const patch = facts.profilePatch as Record<string, unknown>;
    for (const key of PROFILE_PATCH_KEYS) {
      if (key in patch) (profile as Record<string, unknown>)[key] = patch[key];
    }
  }
  if (facts.customers?.length) {
    profile.customers = mergeCustomers(profile.customers ?? [], facts.customers);
  }
  await upsertProfile(profile);

  if (facts.snippet?.trim()) {
    await addMemory(userId, facts.snippet.trim(), "fact");
  }
  return getProfile(userId);
}

export async function setOnboardingDone(userId: string, language: string): Promise<void> {
  const profile = (await getProfile(userId)) ?? {
    user_id: userId,
    loans: [],
    customers: [],
  };
  await upsertProfile({ ...profile, onboarding_done: true, language_pref: language });
}

// ---------- Semantic memory ----------

export async function addMemory(
  userId: string,
  text: string,
  kind: string = "conversation"
): Promise<void> {
  const embedding = await embed(text);
  const { error } = await supabase
    .from("memories")
    .insert({ user_id: userId, text, kind, embedding });
  if (error) throw error;
}

export async function recall(
  userId: string,
  query: string,
  limit = 5
): Promise<MemoryHit[]> {
  const embedding = await embed(query);
  const { data, error } = await supabase.rpc("match_memories", {
    p_user_id: userId,
    p_query: embedding,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as MemoryHit[];
}

export async function recentMemories(userId: string, limit = 8) {
  const { data, error } = await supabase
    .from("memories")
    .select("id, text, kind, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
