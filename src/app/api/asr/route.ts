import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Lazy so `next build` doesn't construct it (Groq throws when the key is absent).
let _groq: Groq | null = null;
function groqClient(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

// Accepts multipart/form-data with an `audio` file (webm/wav from the browser mic),
// transcribes Hindi via Whisper large-v3, returns plain text.
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    if (!audio) return NextResponse.json({ error: "no audio" }, { status: 400 });

    // Lock to the user's chosen language — never auto-detect (causes Hindi→Urdu/English misreads).
    const lang = form.get("language") as string | null;
    const whisperLang = lang === "english" ? "en" : "hi";
    const whisperPrompt = whisperLang === "hi"
      ? "भारतीय छोटे व्यापारी की बातचीत। व्यापार, पैसा, उधार, लोन, माल, ग्राहक, सप्लायर, दुकान।"
      : "Indian small business owner discussing business, money, credit, loans, inventory, customers.";

    const res = await groqClient().audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      language: whisperLang,
      prompt: whisperPrompt,
      response_format: "json",
    });
    return NextResponse.json({ text: res.text });
  } catch (err: any) {
    console.error("[/api/asr]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
