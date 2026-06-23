import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Sarvam Bulbul TTS — a studio-grade female Indian voice. Returns base64 WAV
// chunks the browser plays in order. Falls back (client-side) to the browser
// speechSynthesis voice if this route errors or the key is missing.
const SARVAM_URL = "https://api.sarvam.ai/text-to-speech";
const SPEAKER = "anushka"; // bulbul:v2 female voice

// Sarvam caps each input string (~500 chars). Split on sentence boundaries
// (incl. the Hindi danda "।") so long replies still synthesize, and so the
// first chunk can start playing while the rest are decoded.
function chunkText(text: string, max = 480): string[] {
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max) {
      if (cur.trim()) chunks.push(cur.trim());
      if (s.length > max) {
        for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max).trim());
        cur = "";
      } else {
        cur = s;
      }
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean).slice(0, 10); // safety cap on a single reply
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const key = process.env.SARVAM_API_KEY;
    if (!key) return NextResponse.json({ error: "tts not configured" }, { status: 501 });

    const { text, language = "hindi" } = await req.json().catch(() => ({}));
    if (!text?.trim()) return NextResponse.json({ error: "empty text" }, { status: 400 });

    const inputs = chunkText(String(text).slice(0, 5000));
    if (!inputs.length) return NextResponse.json({ audios: [] });

    const target_language_code = language === "english" ? "en-IN" : "hi-IN";

    const res = await fetch(SARVAM_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        target_language_code,
        speaker: SPEAKER,
        model: "bulbul:v2",
        pitch: 0,
        pace: 1.0,
        loudness: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[/api/tts] sarvam error", res.status, detail.slice(0, 300));
      return NextResponse.json({ error: "tts upstream failed" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ audios: data.audios ?? [] });
  } catch (err: any) {
    console.error("[/api/tts]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
