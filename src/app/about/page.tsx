"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function Logo() {
  return (
    <Link href="/" className="nav-logo">
      <img src="/vyapaari_logo_wordmark.svg" alt="Vyapaari AI" className="nav-logo-img" />
    </Link>
  );
}

// Consistent line-art icons (stroke style)
const ic = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ICONS = [
  // voice
  <svg key="0" viewBox="0 0 24 24" {...ic}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/></svg>,
  // memory
  <svg key="1" viewBox="0 0 24 24" {...ic}><path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8A3 3 0 0 0 9 18a3 3 0 0 0 3 1 3 3 0 0 0 3-1 3 3 0 0 0 2-5.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4Z"/><path d="M12 3v16"/></svg>,
  // price / chai
  <svg key="2" viewBox="0 0 24 24" {...ic}><path d="M5 8h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2M4 21h13"/></svg>,
];

const HI = {
  navCtaNew: "शुरू करें →",
  navCtaReturn: "चैट खोलें →",
  toggleBtn: "English",
  badge: "भारत के छोटे व्यापारियों के लिए",
  h1a: "बस बोलिए,",
  h1b: "आपका AI सलाहकार सुन रहा है",
  sub: "अपने व्यापार की बात हिंदी या अंग्रेज़ी में करें। हर बात याद रहती है। एक चाय की कीमत पर।",
  cta1New: "बात शुरू करें →",
  cta1Return: "चैट जारी रखें →",
  cta2New: "यह कैसे काम करता है?",
  cta2Return: "नया खाता",
  note: "कोई ऐप नहीं · किसी भी फ़ोन पर · बोलें या टाइप करें",
  b1: "बस बोलें",
  b1p: "हिंदी या English",
  b2: "सब याद रहता है",
  b2p: "कभी कुछ नहीं भूलता।",
  b3: "चाय की कीमत पर",
  b3p: "शुरुआत बिल्कुल मुफ़्त",
};

const EN = {
  navCtaNew: "Start →",
  navCtaReturn: "Open Chat →",
  toggleBtn: "हिंदी",
  badge: "For India's small business owners",
  h1a: "Just talk.",
  h1b: "Your AI advisor is listening",
  sub: "Tell it about your business in Hindi or English. It remembers everything. For the price of a chai.",
  cta1New: "Start talking →",
  cta1Return: "Continue chatting →",
  cta2New: "How does it work?",
  cta2Return: "New account",
  note: "No app · Works on any phone · Speak or type",
  b1: "Just speak",
  b1p: "Hindi or English",
  b2: "It remembers",
  b2p: "Never forgets a thing.",
  b3: "Costs a chai",
  b3p: "Free to start",
};

export default function Landing() {
  const [returning, setReturning] = useState(false);
  const [showEn, setShowEn] = useState(false);

  useEffect(() => {
    setReturning(!!localStorage.getItem("vyapaari_user_id"));
  }, []);

  const c = showEn ? EN : HI;

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="nav">
        <Logo />
        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowEn((v) => !v)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            {c.toggleBtn}
          </button>
          <Link href="/chat" className="btn btn-primary btn-sm">
            {returning ? c.navCtaReturn : c.navCtaNew}
          </Link>
        </div>
      </nav>

      {/* Hero — single, calm, mostly above the fold */}
      <section className="hero" style={{ display: "block", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <div className="hero-main">
          <div className="hero-kicker" style={{ justifyContent: "center" }}>{c.badge}</div>
          <h1>
            {c.h1a}{" "}
            <span>{c.h1b}</span>
          </h1>
          <p className="hero-sub" style={{ marginLeft: "auto", marginRight: "auto" }}>{c.sub}</p>
          <div className="hero-cta" style={{ justifyContent: "center" }}>
            <Link href="/chat" className="btn btn-accent btn-lg">
              {returning ? c.cta1Return : c.cta1New}
            </Link>
          </div>
          <p className="hero-note">{c.note}</p>
        </div>
      </section>

      {/* Three ultra-short benefits */}
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="section-inner">
          <div className="features" style={{ maxWidth: 880, margin: "0 auto" }}>
            <div className="feature" style={{ textAlign: "center" }}>
              <div className="feature-icon" style={{ marginLeft: "auto", marginRight: "auto" }}>{ICONS[0]}</div>
              <h3>{c.b1}</h3>
              <p>{c.b1p}</p>
            </div>
            <div className="feature" style={{ textAlign: "center" }}>
              <div className="feature-icon" style={{ marginLeft: "auto", marginRight: "auto" }}>{ICONS[1]}</div>
              <h3>{c.b2}</h3>
              <p>{c.b2p}</p>
            </div>
            <div className="feature" style={{ textAlign: "center" }}>
              <div className="feature-icon" style={{ marginLeft: "auto", marginRight: "auto" }}>{ICONS[2]}</div>
              <h3>{c.b3}</h3>
              <p>{c.b3p}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
