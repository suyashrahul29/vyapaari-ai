import Groq from "groq-sdk";

// Reasoning brain for all agents = Groq Llama 3.3 70B (fast, generous free tier).
// Embeddings stay on Gemini (see embeddings.ts). To upgrade the Advisor specifically
// to Claude later, branch on the caller here — it's a one-spot change.
let _groq: Groq | null = null;
function groq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const MODEL = "llama-3.3-70b-versatile";

export async function chat(
  system: string,
  user: string,
  opts: {
    json?: boolean;
    temperature?: number;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  } = {}
): Promise<string> {
  const res = await groq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      ...(opts.history ?? []),
      { role: "user", content: user },
    ],
    temperature: opts.temperature ?? 0.4,
    // Groq JSON mode needs the word "json" present in the prompt (ours have it).
    response_format: opts.json ? { type: "json_object" } : undefined,
  });
  const content = res.choices[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("LLM returned empty content");
  return content;
}

// Parse JSON the model returned, tolerating accidental ```json fences and
// surrounding prose. Falls back to extracting the first balanced {...} object.
export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const candidate = firstBalancedObject(cleaned);
    if (candidate) return JSON.parse(candidate) as T;
    throw err;
  }
}

// Extract the first balanced {...} substring, ignoring braces inside strings.
function firstBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
