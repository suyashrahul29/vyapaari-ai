# Vyapaari.AI — hackathon build

Voice-first AI business consultant with a **compounding Business Brain**. Multi-agent
orchestration (LangGraph.js) over a real `pgvector` memory. Hinglish, voice in/out.

> The slide is the production architecture; this demo proves the core compounding loop
> end-to-end — recall + grounded math + a proactive catch.

## What's here

| Piece | File |
|---|---|
| Business Brain schema (pgvector) | `db/schema.sql` |
| Structured + semantic memory | `src/lib/brain.ts`, `src/lib/embeddings.ts` |
| Calculator tools (grounding) | `src/lib/calculator.ts` |
| Agent system prompts (the IP) | `src/lib/prompts.ts` |
| LangGraph orchestration | `src/lib/graph.ts` |
| API routes | `src/app/api/{turn,asr,insight,brain}/route.ts` |
| Three-pane voice UI | `src/app/page.tsx` |
| Demo seed (Ramesh + Sharma) | `scripts/seed.ts` |

## Setup — ~30 minutes from zero

### 1. Keys (all free, no card)
- **Supabase** — create a project → Settings → API → copy the URL + `service_role` key.
- **Gemini** — https://aistudio.google.com/app/apikey
- **Groq** — https://console.groq.com/keys
- (optional) **Sarvam** — https://dashboard.sarvam.ai for nicer Hinglish TTS later.

Copy `.env.example` → `.env.local` and fill them in.

### 2. Create the Brain
In the Supabase dashboard → **SQL Editor** → paste all of `db/schema.sql` → **Run**.
(This enables `pgvector`, creates both tables, and the `match_memories` recall function.)

### 3. Install + seed + run
```powershell
npm install
npm run seed         # loads Ramesh's garment business + the escalating Sharma history
npm run test-turn    # CLI sanity check: fires the Sharma question through the full graph
npm run test-insight # CLI sanity check: the proactive Insight agent
npm run dev          # http://localhost:3000
```

> **Re-seed right before recording the demo.** Every turn's Profiler writes the question
> back into the Brain (the continuous-capture loop), so repeated test runs add duplicate
> memories. `npm run seed` wipes + reloads a clean canonical state.

### Model notes (verified working)
- **Reasoning** runs on **Groq `llama-3.3-70b-versatile`** (the Gemini free tier returned
  `limit: 0` for text generation on our key — Groq sidesteps that and is faster anyway).
- **Embeddings** run on **Gemini `gemini-embedding-001`** pinned to 768 dims (matches the
  `vector(768)` schema). `text-embedding-004` is retired.
- **ASR** = Groq Whisper. **TTS** = browser `speechSynthesis` (Sarvam swap optional).

## The demo (rehearse 3×)

1. Tap the mic, say in Hinglish:
   **"Sharma ko aur 50k ka maal udhaar pe de du? Diwali aa rahi hai."**
2. Watch: ASR → `router` → `retrieve` (Sharma memories light up ⭐ in the Brain panel) →
   `advisor` (calculator runs `creditExposurePct`) → spoken reply that recalls the
   30k → 50k → 80k trail and warns about exposure.
3. The new request is written back to the Brain (panel updates).
4. Hit **Run Insight Agent** → it surfaces the unasked-for risk (Sharma + a second
   customer drifting late).

## Verify it's real (not the LLM guessing)
- Supabase → `memories` has 7 rows with embeddings; `business_profile` has Ramesh.
- The reply cites all three Sharma amounts + the 80k → that's pgvector recall.
- The exposure % matches `creditExposurePct(owed, cash)` in `calculator.ts`.
- `traceSteps` shows router → retrieve → advisor → profiler firing in order.

## Notes / swaps
- **TTS**: browser `speechSynthesis` by default. For the recording, swap in Sarvam
  Bulbul (one function in `page.tsx`'s `speak()` → an `/api/tts` route).
- **Advisor brain**: Gemini Flash. For sharper advice, point `src/lib/llm.ts` at Claude.
- **Cut order if behind**: drop Sarvam, then the trace pane — never the recall + catch.
