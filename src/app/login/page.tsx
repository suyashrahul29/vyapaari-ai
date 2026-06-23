"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Language = "hindi" | "english";

const LANG_LABELS: Record<Language, string> = { hindi: "हि", english: "EN" };

const UI = {
  hindi: {
    welcome: "नमस्ते! 🙏 अपने नंबर से लॉगिन करें।",
    phoneTitle: "अपना नंबर डालिए",
    phoneSubLine1: "लॉगिन करने के लिए हम आपको एक कोड भेजेंगे।",
    phoneSubLine2: "कोई पासवर्ड याद रखने की ज़रूरत नहीं।",
    helper: "10 अंकों का मोबाइल नंबर",
    send: "कोड भेजें",
    sending: "भेज रहे हैं…",
    otpTitle: "कोड डालिए",
    sentTo: "भेजा गया",
    changeNumber: "नंबर बदलें",
    verify: "वेरिफाई करके आगे बढ़ें",
    verifying: "वेरिफाई कर रहे हैं…",
  },
  english: {
    welcome: "Namaste! 🙏 Log in with your number.",
    phoneTitle: "Enter your number",
    phoneSubLine1: "We'll text you a code to log in.",
    phoneSubLine2: "No password to remember.",
    helper: "10-digit mobile number",
    send: "Send code",
    sending: "Sending…",
    otpTitle: "Enter the code",
    sentTo: "Sent to",
    changeNumber: "Change number",
    verify: "Verify & continue",
    verifying: "Verifying…",
  },
} as const;

function NavLogo() {
  return (
    <Link href="/" className="nav-logo">
      <img src="/vyapaari_logo_wordmark.svg" alt="Vyapaari AI" className="nav-logo-img" />
    </Link>
  );
}

// Normalise to E.164. Supabase requires the country code. Defaults to +91 (India)
// when the user types a bare 10-digit number.
function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.length >= 11 ? digits : null;
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  return null;
}

export default function Login() {
  const router = useRouter();
  const [phase, setPhase] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("hindi");

  const t = UI[language];

  // If already logged in, skip login and go straight to chat.
  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/chat");
    }).catch(() => {
      // Ignore — stay on the login page if the session check fails.
    });
  }, [router]);

  // Restore the app-wide language preference (same key the rest of the app uses).
  useEffect(() => {
    const stored = localStorage.getItem("vyapaari_language");
    if (stored === "english" || stored === "hindi") setLanguage(stored);
  }, []);

  function switchLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem("vyapaari_language", lang);
  }

  async function sendOtp() {
    const e164 = toE164(phone);
    if (!e164) {
      setError("Enter a valid mobile number (10 digits, or with +country code).");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setPhone(e164); // keep the normalised value for verify
      setPhase("otp");
    } catch (e: any) {
      setError(e?.message ?? "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (otp.trim().length < 4) {
      setError("Enter the OTP you received.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { data, error } = await supabaseBrowser().auth.verifyOtp({
        phone,
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("Login succeeded but no user id returned.");

      // Tie all existing per-user data to the authenticated UUID. Existing API
      // routes read this same localStorage key, so they keep working unchanged.
      localStorage.setItem("vyapaari_user_id", userId);

      // No separate onboarding — chat learns the business organically and greets
      // new owners on its own.
      router.push("/chat");
    } catch (e: any) {
      setError(e?.message ?? "Invalid or expired OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="nav">
        <NavLogo />
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
      </nav>

      <div
        className="onboard-wrap"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}
      >
        <div
          className="onboard-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          {phase === "phone" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p
                  className="onboard-sub"
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  {t.welcome}
                </p>
                <h1 className="onboard-title" style={{ fontSize: 30 }}>
                  {t.phoneTitle}
                </h1>
                <p className="onboard-sub" style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
                  {t.phoneSubLine1}
                  <br />
                  <span style={{ color: "var(--muted)" }}>{t.phoneSubLine2}</span>
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    overflow: "hidden",
                    background: "var(--surface)",
                  }}
                >
                  <span
                    style={{
                      padding: "18px 14px",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "var(--muted)",
                      borderRight: "1px solid var(--border)",
                      userSelect: "none",
                    }}
                  >
                    +91
                  </span>
                  <input
                    className="composer-input"
                    style={{
                      flex: 1,
                      border: "none",
                      borderRadius: 0,
                      padding: "18px 16px",
                      fontSize: 20,
                      letterSpacing: 1,
                      background: "transparent",
                    }}
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                    disabled={busy}
                    autoFocus
                  />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  {t.helper}
                </p>
              </div>

              <button
                className="btn btn-accent"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "18px 16px",
                  fontSize: 17,
                  borderRadius: "var(--r-lg)",
                }}
                onClick={sendOtp}
                disabled={busy}
              >
                {busy ? t.sending : t.send}
              </button>
            </>
          )}

          {phase === "otp" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h1 className="onboard-title" style={{ fontSize: 30 }}>
                  {t.otpTitle}
                </h1>
                <p className="onboard-sub" style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
                  {t.sentTo} <strong>{phone}</strong>
                </p>
                <button
                  onClick={() => { setPhase("phone"); setOtp(""); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 15,
                    textDecoration: "underline",
                    alignSelf: "center",
                  }}
                >
                  {t.changeNumber}
                </button>
              </div>

              <input
                className="composer-input"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  padding: "20px 16px",
                  fontSize: 28,
                  letterSpacing: 12,
                  textAlign: "center",
                  fontWeight: 600,
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                disabled={busy}
                autoFocus
              />

              <button
                className="btn btn-accent"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "18px 16px",
                  fontSize: 17,
                  borderRadius: "var(--r-lg)",
                }}
                onClick={verifyOtp}
                disabled={busy}
              >
                {busy ? t.verifying : t.verify}
              </button>
            </>
          )}

          {error && (
            <p
              style={{
                color: "var(--red)",
                fontSize: 14,
                textAlign: "center",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
