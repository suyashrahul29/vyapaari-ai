"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

/**
 * Animated splash / intro screen at "/".
 * - Draws the brand mark (rising curve + 3 growing dots) as inline SVG.
 * - Fades in the "Vyapaari AI" wordmark + tagline.
 * - After ~3s, fades out and redirects: /chat if logged in, else /login.
 * - Respects prefers-reduced-motion (static logo, then advance).
 */
export default function Splash() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const destRef = useRef<string>("/login");

  useEffect(() => {
    let cancelled = false;

    // Resolve the destination as early as possible.
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) destRef.current = data.session ? "/chat" : "/login";
      })
      .catch(() => {
        if (!cancelled) destRef.current = "/login";
      });

    // Trigger fade-out shortly before navigating.
    const fadeTimer = setTimeout(() => {
      if (!cancelled) setLeaving(true);
    }, 2600);

    // Navigate after the full intro (~3s).
    const navTimer = setTimeout(() => {
      if (!cancelled) router.replace(destRef.current);
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <div className={`splash${leaving ? " splash-leaving" : ""}`}>
      <div className="splash-inner">
        {/* Brand mark: rising curve + three growing dots (animated internals) */}
        <svg
          className="splash-mark"
          viewBox="100 0 150 130"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            className="splash-curve"
            d="M134 78 C158 74 164 46 184 34 C204 22 214 18 232 4"
            fill="none"
            stroke="#3B2B23"
            strokeWidth="4.5"
            strokeLinecap="round"
            transform="translate(-13,16)"
          />
          <circle className="splash-dot splash-dot-1" cx="121" cy="110" r="5.5" fill="#3B2B23" />
          <circle className="splash-dot splash-dot-2" cx="171" cy="66" r="6.5" fill="#3B2B23" />
          <circle className="splash-dot splash-dot-3" cx="219" cy="32" r="11" fill="#E86A1C" />
        </svg>

        <h1 className="splash-wordmark">
          Vyapaari<span className="splash-accent"> AI</span>
        </h1>
        <p className="splash-tagline">Bada socho, chhoti dukaan se.</p>
      </div>
    </div>
  );
}
