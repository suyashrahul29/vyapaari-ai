// Seeds the Business Brain with Ramesh's garment business + an escalating Sharma
// credit history, so the live demo's "catch" lands. Run: npm run seed
import { config } from "dotenv";
config({ path: ".env.local" }); // Next loads .env.local automatically; standalone scripts don't.
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. Set it in .env.local`);
  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);
const genai = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));
const embModel = genai.getGenerativeModel({ model: "gemini-embedding-001" });

async function embed(text: string): Promise<number[]> {
  const r = await embModel.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: 768,
  } as any);
  return r.embedding.values;
}

const USER = "ramesh";
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

async function main() {
  console.log("Seeding Business Brain for", USER, "...");

  // ---- structured profile ----
  const { error: profErr } = await supabase.from("business_profile").upsert({
    user_id: USER,
    owner_name: "Ramesh Patel",
    business_type: "Garment manufacturing & wholesale",
    city: "Surat",
    turnover: 20000000, // 2 crore / year
    margin_pct: 18,
    cash_on_hand: 250000, // 2.5 lakh
    peak_season: "Diwali (Oct-Nov)",
    loans: [{ lender: "HDFC", principal: 600000, emi: 40000, months_left: 14 }],
    customers: [
      { name: "Sharma", owed: 80000, last_paid: "1 week ago, partial & late", trend: "worsening" },
      { name: "Patel Traders", owed: 25000, last_paid: "2 weeks ago, slightly late", trend: "worsening" },
      { name: "Mehta Stores", owed: 15000, last_paid: "on time", trend: "stable" },
    ],
    updated_at: new Date().toISOString(),
  });
  if (profErr) throw new Error(`business_profile upsert failed: ${profErr.message} (${profErr.code}). Did you run db/schema.sql in the Supabase SQL editor?`);
  console.log("  ✓ business_profile");

  // ---- semantic memories (the escalating Sharma trail) ----
  await supabase.from("memories").delete().eq("user_id", USER);

  const mems: { text: string; kind: string; when: string }[] = [
    { text: "Business overview: Ramesh runs a garment manufacturing aur wholesale business Surat me, around 2 crore turnover, 18% margin, peak season Diwali ke aas paas.", kind: "fact", when: daysAgo(60) },
    { text: "Sharma ne 30,000 ka maal udhaar pe liya, bola agle hafte paise de dega. Purana customer hai.", kind: "conversation", when: daysAgo(42) },
    { text: "Sharma ne abhi tak woh 30,000 nahi diye, upar se 20,000 aur ka stock maang raha hai. Total 50,000 ho gaya. Thoda tension hai.", kind: "conversation", when: daysAgo(21) },
    { text: "Sharma ne 50,000 ka aur maal credit pe le liya, ab total 80,000 udhaar hai aur har baar payment late ho rahi hai.", kind: "conversation", when: daysAgo(7) },
    { text: "Patel Traders bhi ab thoda late kar raha hai payment me, pehle time pe deta tha.", kind: "conversation", when: daysAgo(10) },
    { text: "HDFC ka business loan chal raha hai, 40,000 monthly EMI, abhi 14 months bache hai.", kind: "fact", when: daysAgo(90) },
    { text: "Diwali season me sales har saal acchi hoti hai, pichle teen saal se Diwali revenue badh raha hai.", kind: "fact", when: daysAgo(120) },
  ];

  for (const m of mems) {
    const embedding = await embed(m.text);
    const { error: memErr } = await supabase.from("memories").insert({
      user_id: USER, text: m.text, kind: m.kind, embedding, created_at: m.when,
    });
    if (memErr) throw new Error(`memories insert failed: ${memErr.message} (${memErr.code})`);
    console.log("  ✓ memory:", m.text.slice(0, 50) + "...");
  }

  console.log("\nDone. Try asking: \"Sharma ko aur 50k ka maal udhaar pe de du? Diwali aa rahi hai.\"");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
