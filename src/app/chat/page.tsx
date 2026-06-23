"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

async function authFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

type Msg = { role: "user" | "ai"; text: string };
type Language = "hindi" | "english";
type Profile = {
  owner_name?: string;
  onboarding_done?: boolean;
  business_type?: string;
  city?: string;
  turnover?: number | null;
  margin_pct?: number | null;
  cash_on_hand?: number | null;
  peak_season?: string;
  customers?: Array<{ name: string; owed: number }>;
  loans?: Array<{ lender: string; emi: number }>;
};

const LANG_LABELS: Record<Language, string> = { hindi: "हि", english: "EN" };

const EMPTY_PROMPTS: Record<Language, string[]> = {
  english: [
    "Should I extend more credit to Sharma?",
    "Is it a good idea to take a ₹5L loan now?",
    "My supplier raised prices — what do I do?",
  ],
  hindi: [
    "क्या शर्मा को और 50 हज़ार उधार दे दूं?",
    "अभी 5 लाख का लोन लेना ठीक रहेगा?",
    "सप्लायर ने दाम बढ़ा दिए — अब क्या करूं?",
  ],
};

const UI = {
  hindi: {
    greeting: "नमस्ते! 🙏 मैं Vyapaari AI हूं — आपका AI बिज़नेस सलाहकार। माइक दबाएं और बताएं — आपका नाम क्या है?",
    heroTitle: "बात करके पूछें",
    heroSub: "माइक दबाएं और अपने व्यापार के बारे में कुछ भी पूछें",
    listening: "सुन रहा हूं…",
    thinking: "सोच रहा हूं…",
    speaking: "बोल रहा हूं…",
    placeholder: "यहाँ लिखें…",
    busyPlaceholder: "सोच रहा हूं…",
    tapToTalk: "बात करने के लिए दबाएं",
    tapToStop: "रोकने के लिए दबाएं",
    close: "बंद करें",
    typeInstead: "लिखकर पूछें",
    continueBtn: "सलाहकार शुरू करें →",
  },
  english: {
    greeting: "Hello! 🙏 I'm Vyapaari AI — your AI business advisor. Tap the mic and tell me — what's your name?",
    heroTitle: "Just talk to me",
    heroSub: "Tap the mic and ask anything about your business",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    placeholder: "Type your question…",
    busyPlaceholder: "Thinking…",
    tapToTalk: "Tap to talk",
    tapToStop: "Tap to stop",
    close: "Close",
    typeInstead: "Type instead",
    continueBtn: "Start advising →",
  },
};

// Count filled key profile fields (out of 8) for the onboarding progress bar.
function countProgress(p: Profile | null): { filled: number; total: number } {
  if (!p) return { filled: 0, total: 8 };
  let filled = 0;
  if (p.owner_name) filled++;
  if (p.business_type) filled++;
  if (p.city) filled++;
  if (p.turnover != null) filled++;
  if (p.margin_pct != null) filled++;
  if (p.cash_on_hand != null) filled++;
  if (p.peak_season) filled++;
  if ((p.customers?.length ?? 0) > 0 || (p.loans?.length ?? 0) > 0) filled++;
  return { filled, total: 8 };
}

const FEMALE_VOICE_HINTS =
  /heera|kalpana|swara|aditi|veena|lekha|neerja|priya|isha|pooja|ananya|raveena|female|woman|\bhia\b|\bfem\b/i;
const MALE_VOICE_HINTS = /hemant|ravi|prabhat|madhur|prabhakar|\bmale\b|\bman\b/i;

function pickIndianFemaleVoice(voices: SpeechSynthesisVoice[], lang: Language): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const wantHindi = lang !== "english";
  const hiAll = voices.filter((v) => /^hi(-|_|$)/i.test(v.lang));
  const enIN = voices.filter((v) => /^en[-_]?in/i.test(v.lang));
  const enAll = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pools = wantHindi ? [hiAll, enIN, enAll, voices] : [enIN, enAll, voices];
  for (const pool of pools) {
    if (!pool.length) continue;
    const female =
      pool.find((v) => FEMALE_VOICE_HINTS.test(v.name)) ??
      pool.find((v) => !MALE_VOICE_HINTS.test(v.name));
    if (female) return female;
  }
  return voices[0];
}

function NavLogo() {
  return (
    <Link href="/" className="nav-logo">
      <img src="/vyapaari_logo_wordmark.svg" alt="Vyapaari AI" className="nav-logo-img" />
    </Link>
  );
}

export default function Chat() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [language, setLanguage] = useState<Language>("hindi");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullProfile, setFullProfile] = useState<Profile | null>(null);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speakGenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const moreComingRef = useRef(0);
  // Ref keeps language always-current so TTS/ASR closures are never stale.
  const langRef = useRef<Language>("hindi");
  // Tracks mount state so async mic/getUserMedia callbacks can bail after unmount.
  const mountedRef = useRef(true);
  // Guards the session-init effect against React StrictMode double-invocation.
  const didInit = useRef(false);
  const [brainError, setBrainError] = useState(false);

  const u = UI[language];
  const { filled, total } = countProgress(fullProfile);
  // Treat onboarding as incomplete only when we actually have a profile saying so.
  // If the brain fetch failed (brainError) we avoid forcing the user into the
  // onboarding flow forever — a load failure is not the same as "no profile".
  const isOnboarding = !fullProfile?.onboarding_done && !brainError;
  const canContinue = isOnboarding && filled >= 5;

  // Preload TTS voices — Chrome fires "voiceschanged" async after first call.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const load = () => { const v = synth.getVoices(); if (v.length) voicesRef.current = v; };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  // Persist conversation to localStorage after every message.
  useEffect(() => {
    if (userId && msgs.length > 0) {
      localStorage.setItem(`vyapaari_msgs_${userId}`, JSON.stringify(msgs.slice(-50)));
    }
  }, [msgs, userId]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      const { data } = await supabaseBrowser().auth.getSession();
      const session = data.session;
      if (!session) { router.replace("/login"); return; }

      const id = session.user.id;
      const stored = localStorage.getItem("vyapaari_language");
      const lang: Language = stored === "english" ? "english" : "hindi";
      setUserId(id);
      setLanguage(lang);
      langRef.current = lang;

      const p = await refreshBrain(id);

      // Already onboarded — restore saved chat or show empty advisor screen.
      if (p?.onboarding_done) {
        const savedRaw = localStorage.getItem(`vyapaari_msgs_${id}`);
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw) as Msg[];
            if (Array.isArray(saved) && saved.length > 0) { setMsgs(saved); return; }
          } catch {}
        }
        return; // No saved msgs — empty advisor screen, chips will show.
      }

      // Resume saved onboarding conversation (back-navigation fix from P0).
      const savedRaw = localStorage.getItem(`vyapaari_msgs_${id}`);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw) as Msg[];
          if (Array.isArray(saved) && saved.length > 0) { setMsgs(saved); return; }
        } catch {}
      }

      // Brand-new user: set greeting and auto-speak it.
      const greeting = UI[lang].greeting;
      setMsgs([{ role: "ai", text: greeting }]);
      speak(greeting);
    })();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      speakGenRef.current++;
      moreComingRef.current = 0;
      try { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); } catch {}
      if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
      queueRef.current = [];
      const mr = mediaRef.current;
      if (mr && mr.state !== "inactive") { try { mr.stop(); } catch {} }
      mr?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function refreshBrain(uid?: string): Promise<Profile | null> {
    const id = uid ?? userId;
    if (!id) return null;
    try {
      const r = await authFetch("/api/brain");
      const d = await r.json();
      const profile: Profile | null = d.profile ?? null;
      setFullProfile(profile);
      setBrainError(false);
      return profile;
    } catch {
      // A failed fetch is distinct from "no profile": flag the error so the UI
      // doesn't permanently trap the user in onboarding when /api/brain is down.
      setBrainError(true);
      return null;
    }
  }

  function stopPlayback() {
    try { window.speechSynthesis?.cancel(); } catch {}
    if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
    queueRef.current = [];
  }

  // Uses langRef.current so the correct language is sent even when React state hasn't
  // propagated yet (e.g., the auto-spoken greeting fires before the state update settles).
  async function fetchTTS(text: string): Promise<string[]> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast audio fallback
    try {
      const r = await authFetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: langRef.current }),
        signal: controller.signal,
      });
      clearTimeout(id);
      if (!r.ok) throw new Error("tts " + r.status);
      const d = await r.json();
      return (d.audios ?? []) as string[];
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  function playQueue(gen: number) {
    if (speakGenRef.current !== gen) return;
    const b64 = queueRef.current.shift();
    if (!b64) {
      audioRef.current = null;
      if (moreComingRef.current !== gen) setSpeaking(false);
      return;
    }
    const a = new Audio(`data:audio/wav;base64,${b64}`);
    audioRef.current = a;
    setSpeaking(true);
    const advance = () => { if (speakGenRef.current === gen) playQueue(gen); };
    a.onended = advance;
    a.onerror = advance;
    a.play().catch(advance);
  }

  async function speak(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const gen = ++speakGenRef.current;
    stopPlayback();
    setSpeaking(true); // Animate orb immediately to cover TTS fetch latency

    const sentences =
      clean.match(/[^.!?।\n]+[.!?।\n]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
    const first = sentences[0] ?? clean;
    const rest = sentences.slice(1).join(" ").trim();

    moreComingRef.current = rest ? gen : 0;
    const firstP = fetchTTS(first).catch(() => null);
    const restP = rest ? fetchTTS(rest).catch(() => null) : Promise.resolve<string[] | null>([]);

    const firstAudios = await firstP;
    if (speakGenRef.current !== gen) return;
    if (!firstAudios || !firstAudios.length) {
      moreComingRef.current = 0;
      speakBrowser(clean, gen);
      return;
    }

    queueRef.current.push(...firstAudios);
    if (!audioRef.current) playQueue(gen);

    const restAudios = await restP;
    if (speakGenRef.current !== gen) return;
    moreComingRef.current = 0;
    if (restAudios && restAudios.length) {
      queueRef.current.push(...restAudios);
      if (!audioRef.current) playQueue(gen);
    } else if (!audioRef.current && !queueRef.current.length) {
      setSpeaking(false);
    }
  }

  function speakBrowser(text: string, gen: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
      const voice = pickIndianFemaleVoice(voices, langRef.current);
      const langCode = voice?.lang ?? (langRef.current === "english" ? "en-IN" : "hi-IN");
      const chunks =
        text.match(/[^.!?।\n]+[.!?।\n]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
      chunks.forEach((chunk, i) => {
        const utt = new SpeechSynthesisUtterance(chunk);
        utt.lang = langCode;
        if (voice) utt.voice = voice;
        utt.rate = 1.0;
        utt.pitch = 1.0;
        if (i === 0) utt.onstart = () => { if (speakGenRef.current === gen) setSpeaking(true); };
        // Clear speaking on any chunk error (not just the last) so an early
        // failure doesn't leave the orb stuck in the speaking state.
        utt.onerror = () => { if (speakGenRef.current === gen) setSpeaking(false); };
        if (i === chunks.length - 1) {
          utt.onend = () => { if (speakGenRef.current === gen) setSpeaking(false); };
        }
        synth.speak(utt);
      });
    } catch {
      setSpeaking(false);
    }
  }

  async function sendText(text: string) {
    if (!text.trim() || busy || !userId) return;
    const history = msgs.slice(-6);
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await authFetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), language: langRef.current, history }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMsgs((m) => [...m, { role: "ai", text: d.reply }]);
      speak(d.reply);
      await refreshBrain();
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "ai", text: "⚠️ " + (e?.message ?? "error") }]);
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    if (recording) {
      // Wrap stop so a throw can't leave `recording` stuck true.
      try { mediaRef.current?.stop(); } catch {}
      setRecording(false);
      return;
    }
    // Stop any ongoing AI speech playback when the user starts speaking
    stopPlayback();
    setSpeaking(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      // The await above can resolve after the component unmounts (or after a
      // rapid toggle): release the stream immediately and bail instead of leaking it.
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      
      // Determine the best supported mime type for browser compatibility
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
        "audio/aac",
        "audio/wav"
      ];
      let selectedMimeType = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }
      
      const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
      const mr = new MediaRecorder(stream, options);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        
        let extension = "webm";
        if (mr.mimeType.includes("mp4")) extension = "mp4";
        else if (mr.mimeType.includes("ogg")) extension = "ogg";
        else if (mr.mimeType.includes("wav")) extension = "wav";
        else if (mr.mimeType.includes("aac")) extension = "aac";
        else if (mr.mimeType.includes("mpeg")) extension = "mp3";

        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, `speech.${extension}`);
        fd.append("language", langRef.current); // always-current, never stale
        setBusy(true);
        try {
          const r = await authFetch("/api/asr", { method: "POST", body: fd });
          const d = await r.json();
          if (d.error) throw new Error(d.error);
          if (d.text) await sendText(d.text);
        } catch (e: any) {
          // Surface ASR failures to the user instead of swallowing them silently.
          setMsgs((m) => [...m, { role: "ai", text: "⚠️ " + (e?.message ?? "Could not transcribe audio.") }]);
        }
        finally { setBusy(false); }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      alert("Microphone access needed — please allow in browser settings.");
    }
  }

  function switchLanguage(lang: Language) {
    setLanguage(lang);
    langRef.current = lang; // update ref immediately so TTS/ASR pick it up right away
    localStorage.setItem("vyapaari_language", lang);
  }

  async function continueToAdvisor() {
    try {
      await authFetch("/api/onboarding-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
    } catch {}
    // Update local state immediately so the UI shifts without waiting for a DB round-trip.
    setFullProfile((p) => p ? { ...p, onboarding_done: true } : { onboarding_done: true });
  }

  async function devReset() {
    if (!confirm("Dev reset: wipes your Brain data, chat history, and session. Continue?")) return;
    try { await authFetch("/api/dev-reset", { method: "POST" }); } catch {}
    localStorage.clear();
    await supabaseBrowser().auth.signOut();
    router.push("/login");
  }

  const prompts = EMPTY_PROMPTS[language];
  const orbState = recording ? "listening" : busy ? "thinking" : speaking ? "speaking" : "idle";
  const statusText = recording ? u.listening : busy ? u.thinking : speaking ? u.speaking : "";
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  const lastAi = [...msgs].reverse().find((m) => m.role === "ai");

  return (
    <div className="vchat">
      {/* Slim header */}
      <header className="vchat-header">
        <div className="vchat-header-left">
          <NavLogo />
          {fullProfile?.owner_name && (
            <span className="vchat-owner">{fullProfile.owner_name}</span>
          )}
        </div>
        <div className="vchat-header-right">
          <div className="lang-toggle">
            {(["hindi", "english"] as Language[]).map((l) => (
              <button
                key={l}
                className={language === l ? "active" : ""}
                onClick={() => switchLanguage(l)}
                title={l}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          <button
            onClick={devReset}
            title="Dev reset — wipes session and Brain data for re-testing"
            style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", opacity: 0.5 }}
          >
            ↺ reset
          </button>
        </div>
      </header>



      {/* Main stage */}
      <main className="vchat-stage">
        <div className="vchat-captions">
          {orbState !== "idle" && statusText && (
            <div className="vchat-status" role="status" aria-live="polite">{statusText}</div>
          )}
          {lastUser && <p className="vchat-cap-user">{lastUser.text}</p>}
          {lastAi ? (
            <p className="vchat-cap-ai">{lastAi.text}</p>
          ) : (
            <>
              <h1 className="vchat-hero-title">{u.heroTitle}</h1>
              <p className="vchat-hero-sub">{u.heroSub}</p>
            </>
          )}
        </div>

        {/* The orb */}
        <button
          className={`vchat-orb vchat-orb-${orbState}`}
          onClick={toggleMic}
          disabled={busy}
          aria-pressed={recording}
          aria-label={recording ? u.tapToStop : u.tapToTalk}
        >
          <span className="vchat-orb-glow" aria-hidden />
          <span className="vchat-orb-core">
            {recording ? (
              <span className="vchat-orb-stop" aria-hidden />
            ) : (
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
          </span>
        </button>
        <div className="vchat-orb-label">
          {recording ? u.tapToStop : u.tapToTalk}
        </div>

        {/* Continue button — appears when enough Brain fields are collected */}
        {canContinue && !busy && (
          <button
            className="btn btn-primary"
            style={{ marginTop: 28, padding: "14px 36px", fontSize: 16, borderRadius: 12 }}
            onClick={continueToAdvisor}
          >
            {u.continueBtn}
          </button>
        )}

        {/* Suggested prompts — advisor mode only (after onboarding), when no msgs yet */}
        {!isOnboarding && msgs.length === 0 && !recording && !busy && (
          <div className="vchat-chips">
            {prompts.map((p, i) => (
              <button key={i} className="vchat-chip" onClick={() => sendText(p)}>
                {p}
              </button>
            ))}
          </div>
        )}

        <button className="vchat-type-toggle" onClick={() => setShowText((s) => !s)}>
          {showText ? u.close : u.typeInstead}
        </button>
      </main>

      {/* Collapsible text panel: full transcript + composer */}
      {showText && (
        <div className="vchat-textpanel">
          <div className="vchat-transcript">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">{m.text}</div>
              </div>
            ))}
            {busy && msgs[msgs.length - 1]?.role === "user" && (
              <div className="msg ai">
                <div className="bubble typing">{u.thinking}</div>
              </div>
            )}
            <div ref={bottomRef} className="scroll-anchor" />
          </div>

          <div className="composer">
            <button
              className={`mic-btn ${recording ? "rec" : ""}`}
              onClick={toggleMic}
              title="Tap to speak"
              aria-pressed={recording}
              aria-label={recording ? u.tapToStop : u.tapToTalk}
            >
              {recording ? "■" : "🎤"}
            </button>
            <textarea
              className="composer-input"
              value={input}
              placeholder={busy ? u.busyPlaceholder : u.placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(input); }
              }}
              disabled={busy}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={() => sendText(input)}
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
