import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { chat } = await import("../src/lib/llm");
  const { getProfile, recentMemories } = await import("../src/lib/brain");
  const { buildInsightPrompt } = await import("../src/lib/prompts");
  const [profile, mems] = await Promise.all([
    getProfile("ramesh"),
    recentMemories("ramesh", 12),
  ]);
  const block = `PROFILE:\n${JSON.stringify(profile, null, 2)}\n\nRECENT MEMORIES:\n${mems
    .map((m) => `- ${m.text}`)
    .join("\n")}`;
  const alert = await chat(buildInsightPrompt("hindi"), block, { temperature: 0.5 });
  console.log("INSIGHT:\n", alert.trim());
}
main().catch((e) => { console.error(e); process.exit(1); });
