// Quick CLI to exercise the full LangGraph turn without the browser.
// Usage: npm run test-turn  ("optional custom question")
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { runTurn } = await import("../src/lib/graph");
  const q =
    process.argv[2] ||
    "Sharma ko aur 50k ka maal udhaar pe de du? Diwali aa rahi hai.";
  console.log("Q:", q, "\n");
  const out = await runTurn("ramesh", q);
  console.log("INTENT:", out.intent);
  console.log("\nTRACE:");
  for (const t of out.traceSteps) console.log(`  • ${t.node} — ${t.desc}${t.tool ? ` [${t.tool}]` : ""}`);
  console.log("\nRECALLED MEMORIES:");
  for (const h of out.semanticHits) console.log(`  ⭐ (${h.similarity.toFixed(3)}) ${h.text.slice(0, 80)}`);
  console.log("\nTOOL RESULTS:", JSON.stringify(out.toolResults));
  console.log("\nREPLY:\n", out.reply);
}

main().catch((e) => { console.error(e); process.exit(1); });
