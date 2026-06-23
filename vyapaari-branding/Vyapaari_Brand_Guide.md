# Vyapaari AI — Brand Guide (v2 · final)
*Single source of truth. Hand the "Brand tokens" and "Claude Code prompt" sections straight to Claude Code.*

---

## Brand in one line
Vyapaari feels like a smart, trusted, dukaan-savvy advisor — **warm, confident, desi but modern.** Check every visual choice against that sentence.

## Name
**Vyapaari AI** everywhere in the UI, code, and URLs. (Devanagari व्यापारी can be used decoratively later, but the default is "Vyapaari AI".)

## Logo — "Grows with you"
A rising, compounding curve made of three points: two grounded brown nodes and one larger **orange node at the top** — the newest, brightest insight. It pictures the core promise: *the more you talk to it, the smarter it gets.* The orange endpoint is the spark of growth.

Files in this folder:
- `vyapaari_logo_wordmark.svg` — primary horizontal lockup (mark + Vyapaari AI + tagline)
- `vyapaari_logo_stacked.svg` — centered/stacked version (for narrow spaces, splash)
- `vyapaari_app_icon.svg` — square app icon / favicon (brown tile + cream curve + orange spark)

Usage: give the mark clear space; never recolor it outside the palette; the orange endpoint node is always the brightest element. On dark surfaces, swap the brown strokes for cream (as in the app icon).

## Taglines
- **Primary:** Bada socho, chhoti dukaan se *(aspiration + pride)*
- **Hero / emotional:** Aapka business, ab akela nahi *(your business is no longer alone)*
- Alternates: Har dukaan, ab samajhdaar · Ab har faisla, soch samajh ke
- English (decks/investors): The advisor every small business deserves.

## Color palette — Warm Brown
| Role | Name | Hex | Use |
|---|---|---|---|
| Anchor | Brown | `#3B2B23` | Wordmark, headings, primary buttons, dark UI, the logo curve |
| Hero / accent | Orange | `#E86A1C` | CTAs, highlights, the "AI" in the logo, the growth node, active states |
| Highlight | Gold | `#E9A23B` | Small accents, charts, badges, hovers |
| Background | Cream | `#F8F0E3` | Page background (warm, not stark white) |
| Surface | White | `#FFFFFF` | Cards, chat bubbles |
| Text | Ink | `#2A1E16` | Body text (warm near-black) |
| Muted | Taupe | `#6B5E52` | Secondary text, captions |

Contrast rules: cream text on brown; white text on orange (large/bold only); ink text on gold/cream; never pure black on cream — use ink `#2A1E16`.

## Typography
- **Headings:** Poppins (500/600) — warm, rounded, modern.
- **Body:** Inter (400/500) — maximum readability.
- **Hindi / Devanagari:** Noto Sans Devanagari (500/600).
- All free Google Fonts. Import:
  `https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Inter:wght@400;500&family=Noto+Sans+Devanagari:wght@500;600&display=swap`

## Shape & motif
- **Radius:** cards `16px` (rounded-2xl), buttons `12px` (rounded-xl); mic / primary CTA can be a full pill.
- **Motif:** the rising compounding curve from the logo — reuse it subtly behind the hero, in empty states, and as the loading animation (nodes lighting up one by one). Low opacity, background only. Don't overuse.

---

## Brand tokens (CSS variables)
```css
:root{
  --brand-brown:  #3B2B23;  /* anchor */
  --brand-orange: #E86A1C;  /* hero / accent */
  --brand-gold:   #E9A23B;  /* highlight */
  --brand-cream:  #F8F0E3;  /* page bg */
  --brand-white:  #FFFFFF;  /* surface */
  --brand-ink:    #2A1E16;  /* text */
  --brand-muted:  #6B5E52;  /* secondary text */
  --radius-card: 16px;
  --radius-btn: 12px;
}
```

## Claude Code prompt (paste to apply across the app)

> Apply our brand design system across the entire web app, consistently. Tokens:
>
> Colors — anchor brown `#3B2B23`, hero/accent orange `#E86A1C`, highlight gold `#E9A23B`, page background cream `#F8F0E3`, surface white `#FFFFFF`, text ink `#2A1E16`, muted `#6B5E52`.
> Fonts — headings Poppins (600), body Inter (400/500), Hindi Noto Sans Devanagari; load from Google Fonts.
> Shape — cards rounded-16px, buttons rounded-12px, primary CTA can be a pill.
> Buttons — primary = brown bg + cream text; accent/CTA = orange bg + white text; both Poppins 500.
> Surfaces — cream page background, white cards and chat bubbles.
>
> Set these up as reusable design tokens / CSS variables (or Tailwind theme config) so they cascade everywhere. Then restyle: the header/logo, the chat screen, message bubbles, the mic/record button, inputs, and buttons. Use the logo at `vyapaari_logo_wordmark.svg` in the header and `vyapaari_app_icon.svg` as the favicon. Keep it warm, clean, and minimal — generous whitespace, no gradients or heavy shadows. Do NOT change any engine/backend logic — styling and design-token setup only.

---

*Keep branding time-boxed. Now: apply the tokens, drop in the logo, and get back to the engine and the demo — that's what the judges actually grade.*
