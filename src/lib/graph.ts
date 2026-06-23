import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { chat, parseJson } from "./llm";
import { getProfile, recall, applyExtractedFacts, recentMemories } from "./brain";
import { runTool, TOOL_CATALOG, type ToolCall, type ToolResult } from "./calculator";
import {
  ROUTER_PROMPT,
  PROFILER_PROMPT,
  TOOL_PLANNER_PROMPT,
  buildAdvisorPrompt,
  buildConversationPrompt,
} from "./prompts";
import type { BusinessProfile, ExtractedFacts, MemoryHit } from "./types";

// ---------- Shared state ----------
// Agents coordinate ONLY through this state + the Business Brain (Master Doc §7.3).

export type TraceStep = { node: string; desc: string; tool?: string };

type ChatTurn = { role: "user" | "assistant"; content: string };

const State = Annotation.Root({
  userId: Annotation<string>(),
  input: Annotation<string>(),
  language: Annotation<string>(),
  history: Annotation<ChatTurn[]>({ default: () => [], reducer: (_a, b) => b ?? [] }),
  intent: Annotation<string>(),
  profile: Annotation<BusinessProfile | null>(),
  semanticHits: Annotation<MemoryHit[]>(),
  toolResults: Annotation<ToolResult[]>(),
  reply: Annotation<string>(),
  brainUpdate: Annotation<BusinessProfile | null>(),
  traceSteps: Annotation<TraceStep[]>({
    reducer: (a, b) => [...(a ?? []), ...(b ?? [])],
    default: () => [],
  }),
});

type S = typeof State.State;

function profileText(p: BusinessProfile | null): string {
  if (!p) return "(no profile yet)";
  return JSON.stringify(
    {
      owner: p.owner_name,
      business: p.business_type,
      city: p.city,
      turnover: p.turnover,
      margin_pct: p.margin_pct,
      cash_on_hand: p.cash_on_hand,
      peak_season: p.peak_season,
      supplier_terms: p.supplier_terms,
      discount_policy: p.discount_policy,
      main_challenge: p.main_challenge,
      main_goal: p.main_goal,
      loans: p.loans,
      customers: p.customers,
    },
    null,
    2
  );
}

// Which key facts the Brain still doesn't have — drives organic, gradual capture.
function missingFields(p: BusinessProfile | null): string {
  const checks: [string, boolean][] = [
    ["owner's name", !p?.owner_name],
    ["what business they run", !p?.business_type],
    ["city / location", !p?.city],
    ["annual turnover", p?.turnover == null],
    ["profit margin %", p?.margin_pct == null],
    ["cash on hand", p?.cash_on_hand == null],
    ["busy / peak season", !p?.peak_season],
    ["key customers & who owes udhaar", !(p?.customers?.length)],
    ["active loans / EMIs", !(p?.loans?.length)],
    ["supplier credit terms", !p?.supplier_terms],
    ["biggest challenge right now", !p?.main_challenge],
    ["main goal this year", !p?.main_goal],
  ];
  const open = checks.filter(([, m]) => m).map(([label]) => `- ${label}`);
  return open.length ? open.join("\n") : "(nothing important — the Brain is well filled in)";
}

function memText(hits: MemoryHit[]): string {
  if (!hits?.length) return "(no relevant past conversations)";
  return hits
    .map((h) => `- (${new Date(h.created_at).toDateString()}) ${h.text}`)
    .join("\n");
}

// ---------- Nodes ----------

async function router(s: S): Promise<Partial<S>> {
  let intent = "advice";
  try {
    const raw = await chat(ROUTER_PROMPT, s.input, { json: true, temperature: 0 });
    intent = parseJson<{ intent: string }>(raw).intent ?? "advice";
  } catch {
    intent = "advice";
  }
  return {
    intent,
    traceSteps: [{ node: "router", desc: `intent: ${intent}` }],
  };
}

async function retrieve(s: S): Promise<Partial<S>> {
  const [profile, semanticHits] = await Promise.all([
    getProfile(s.userId),
    recall(s.userId, s.input, 5),
  ]);
  return {
    profile,
    semanticHits,
    traceSteps: [
      {
        node: "retrieve",
        desc: `${profile ? "profile + " : ""}${semanticHits.length} memories recalled`,
      },
    ],
  };
}

async function advisor(s: S): Promise<Partial<S>> {
  const lang = s.language ?? "hindi";

  // 1) plan tool calls
  let toolResults: ToolResult[] = [];
  let toolNote = "no tools";
  try {
    const planner = TOOL_PLANNER_PROMPT.replace("{TOOL_CATALOG}", TOOL_CATALOG);
    const planRaw = await chat(
      planner,
      `Question: ${s.input}\n\nProfile:\n${profileText(s.profile)}`,
      { json: true, temperature: 0 }
    );
    const plan = parseJson<{ calls: ToolCall[] }>(planRaw);
    toolResults = (plan.calls ?? [])
      // Drop malformed calls (no tool name or non-object args) so one bad plan
      // entry doesn't crash the whole grounding step.
      .filter(
        (c) =>
          c && typeof c.tool === "string" &&
          c.args && typeof c.args === "object" && !Array.isArray(c.args)
      )
      .map(runTool);
    if (toolResults.length) toolNote = toolResults.map((t) => t.tool).join(", ");
  } catch {
    toolResults = [];
  }

  // 2) reason with grounded context
  const userBlock = [
    `Owner's question: ${s.input}`,
    ``,
    `STRUCTURED PROFILE:\n${profileText(s.profile)}`,
    ``,
    `RECALLED MEMORIES:\n${memText(s.semanticHits)}`,
    ``,
    `CALCULATOR RESULTS (use these numbers, do not invent):\n${
      toolResults.length ? JSON.stringify(toolResults, null, 2) : "(none)"
    }`,
    ``,
    `MISSING CONTEXT (optionally weave in ONE natural follow-up to learn one of these):\n${missingFields(s.profile)}`,
  ].join("\n");

  const reply = await chat(buildAdvisorPrompt(lang), userBlock, {
    temperature: 0.4,
    history: s.history ?? [],
  });
  return {
    toolResults,
    reply: reply.trim(),
    traceSteps: [{ node: "advisor", desc: "reasoned + grounded", tool: toolNote }],
  };
}

async function conversation(s: S): Promise<Partial<S>> {
  const lang = s.language ?? "hindi";
  const system = buildConversationPrompt(lang, profileText(s.profile), missingFields(s.profile));
  const reply = await chat(system, s.input, {
    temperature: 0.6,
    history: s.history ?? [],
  });
  return {
    reply: reply.trim(),
    traceSteps: [{ node: "conversation", desc: "organic learn + reply" }],
  };
}

async function profiler(s: S): Promise<Partial<S>> {
  let brainUpdate = s.profile ?? null;
  try {
    const raw = await chat(PROFILER_PROMPT, s.input, { json: true, temperature: 0 });
    const facts = parseJson<ExtractedFacts>(raw);
    brainUpdate = await applyExtractedFacts(s.userId, facts);
  } catch {
    // non-fatal: keep prior profile
  }
  return {
    brainUpdate,
    traceSteps: [{ node: "profiler", desc: "extracted + wrote back to Brain" }],
  };
}

// ---------- Wiring ----------

// Main graph — profiler is NOT in this graph so the reply returns immediately.
// Profiler runs async from the API route (see api/turn/route.ts) to remove it
// from the user-facing latency critical path.
const builder = new StateGraph(State)
  .addNode("router", router)
  .addNode("retrieve", retrieve)
  .addNode("advisor", advisor)
  .addNode("conversation", conversation)
  .addEdge(START, "router")
  .addEdge("router", "retrieve")
  .addConditionalEdges("retrieve", (s: S) => {
    return s.intent === "advice" ? "advisor" : "conversation";
  })
  .addEdge("advisor", END)
  .addEdge("conversation", END);

export const graph = builder.compile();

// Standalone profiler — called fire-and-forget from the API route so it doesn't
// block the reply. Replicates the profiler node logic without needing full graph state.
export async function runProfilerForUser(userId: string, input: string): Promise<void> {
  try {
    const raw = await chat(PROFILER_PROMPT, input, { json: true, temperature: 0 });
    const facts = parseJson<ExtractedFacts>(raw);
    await applyExtractedFacts(userId, facts);
  } catch (e) {
    console.error("[profiler bg]", e);
  }
}

export async function runTurn(
  userId: string,
  input: string,
  language = "hindi",
  history: ChatTurn[] = []
) {
  const out = await graph.invoke({ userId, input, language, history });
  return {
    reply: out.reply,
    intent: out.intent,
    brainUpdate: out.brainUpdate ?? null,
    semanticHits: out.semanticHits ?? [],
    toolResults: out.toolResults ?? [],
    traceSteps: out.traceSteps ?? [],
  };
}

export { recentMemories };
