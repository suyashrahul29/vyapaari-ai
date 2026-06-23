# Vyapaari AI — Final Push Instructions for Claude Code

**Context:** This is an MVP for a hackathon. We submit in ~2 hours: a working app, a demo video, and a doc. The app already runs locally but has latency, glitches, and flow bugs. Your job is to fix the blockers first, then improve UX, then apply branding, then add nice-to-haves **only if time remains**.

## Rules of engagement (read first, follow strictly)
1. **Work in the exact priority order below. Do NOT jump ahead.** Finish and verify Priority 0, then 1, then 2, and so on.
2. **Never break a working state.** After each priority block, make sure the app still runs (`npm run dev`) before moving on. Commit after each block with a clear message.
3. **Latency, smoothness, and stability are the #1 goal.** A simple app that never glitches beats a feature-rich one that lags. When in doubt, choose the simpler, faster path.
4. **Do not change the hardcoded phone-number + OTP login logic.** It's intentional for the MVP. Leave auth as-is except where Priority 0 explicitly says.
5. **Do not over-engineer.** No new heavy dependencies unless absolutely required. Prefer fixing over rewriting.
6. If you run low on time, **stop at a working checkpoint** and tell me clearly what's done and what's left.
7. Keep everything **minimal and uncluttered** — little text, lots of breathing room, simple and user-friendly.

---

## PRIORITY 0 — Stop the bleeding (blockers + safe re-testing) — DO FIRST
These are breaking the demo. Nothing else matters until these work.

### 0.1 — Onboarding restarts / lags / loses progress
- **Bug:** During voice onboarding, pressing back and returning restarts from "what's your name" instead of resuming; it also lags badly and sometimes restarts on its own.
- **Fix:** Persist onboarding progress (current question index + answers collected so far) to the database/local store **after every answered question**. On returning to the onboarding screen, **resume from the saved step**, never from the start. Eliminate any re-initialization that resets state on re-mount.
- Make sure there is a **single source of truth** for onboarding state, and that navigating away does not wipe it.

### 0.2 — Language auto-switching to English/Urdu mid-Hindi
- **Bug:** User speaks Hindi but the app detects English/Urdu and refuses input.
- **Fix:** **Lock the speech-recognition language explicitly** to the user's chosen language (Hindi = `hi-IN`, English = `en-IN`). Do NOT use auto-detection. The header has a Hindi/English toggle — the speech recognition language must follow that toggle and nothing else.
- Remove/disable any "we can't accept Urdu/English" rejection logic that fires on misdetection. If the recognized language differs, **still accept the text** and proceed; never block the user mid-flow.

### 0.3 — Latency on the voice loop
- Reduce perceived latency in the speech → response → speech loop: show an immediate visual state when the mic is pressed (listening), stream/segment responses where possible, and avoid blocking the UI while waiting for the model. If TTS is slow, start showing the text response immediately and let audio follow.
- Cache/reuse the model/session client instead of re-initializing per turn.

### 0.4 — Dev re-testing safety (so we don't lock ourselves out)
- We need to log in and test repeatedly for the demo video. Add a **simple dev "Reset / Clear my data" control** (a small button on the settings or a hidden dev route, or a documented console/localStorage command) that wipes the current user's session, onboarding progress, and stored memory, returning the app to the logged-out state.
- This lets us re-run the full flow as many times as needed. Document exactly how to trigger it in the README.

**Verify Priority 0:** Full flow works end-to-end — log in → onboard (resume after back works) → reach the post-onboarding screen — in Hindi, with no auto-restart, no language rejection, minimal lag. Commit: `fix: onboarding resume, language lock, latency, dev reset`.

---

## PRIORITY 1 — Core flow & navigation
### 1.1 — Voice onboarding screen polish
- On first opening the mic/onboarding screen, the **agent greets first, automatically**: a short spoken + on-screen welcome — e.g. *"Namaste! Main aapse aur aapke business ke baare mein kuch chhote sawaal poochhunga. Yeh poori tarah safe hai. Bolne ke liye mic dabaayein, dobara dabaa kar rok dein."* Then it asks **the first question: "Aapka naam kya hai?"**
- **Keep every question short and conversational.** One short sentence each. No long prompts.
- Add a **progress indicator** (a thin progress bar or step circle, e.g. "3/7") showing how much onboarding is left. Keep it subtle.
- **Remove the 3 example question chips** (the "kya Sharma ko udhaar doon" etc. buttons) from the onboarding screen — they belong on the daily-chat screen, not here.
- Keep a small **"type instead"** fallback so a user can type if the mic fails (important for the demo if speech glitches).

### 1.2 — Navigation
- Add basic navigation everywhere: a **back control** and a way to return home. Right now there's no way back. Ensure no screen is a dead end.
- After onboarding completes, show a **clear single button** to continue to the daily chat screen (e.g. *"Apna business salahkaar shuru karein →"*).

### 1.3 — Persist login & onboarding across app restarts
- Once a user has logged in, **don't show the login page again** on next open — restore their session and go to the home screen.
- Once onboarding is done, **don't ask for that info again** — load their existing Business Brain.

**Verify Priority 1:** Greeting plays, questions are short, progress shows, no stray chips, navigation works, refresh keeps you logged in. Commit: `feat: onboarding UX, navigation, session persistence`.

---

## PRIORITY 2 — Apply branding (use the attached brand guide)
Apply the brand from our **brand guide MD** (Vyapaari_Brand_Guide.md) across the whole app. **Minimal, clean, uncluttered — not text-heavy.**
- **Colors:** anchor brown `#3B2B23`, hero/accent orange `#E86A1C`, highlight gold `#E9A23B`, page bg cream `#F8F0E3`, surface white `#FFFFFF`, text ink `#2A1E16`, muted `#6B5E52`. Set as CSS variables / Tailwind tokens so they cascade.
- **Fonts:** headings Poppins (600), body Inter (400/500), Hindi Noto Sans Devanagari — load from Google Fonts.
- **Buttons:** primary = brown bg + cream text; accent/CTA = orange bg + white text; rounded-12px. Cards rounded-16px.
- **Logo:** use `vyapaari_logo_wordmark.svg` in the header, `vyapaari_app_icon.svg` as favicon.
- **Motif:** the rising "growing dots" curve from the logo — used subtly, low opacity, backgrounds/loading only. Do not clutter.
- Keep generous whitespace, no gradients, no heavy shadows. The whole app should feel calm, warm, and simple.

**Verify Priority 2:** Consistent brand across landing, login, home, chat. Commit: `style: apply Vyapaari brand system`.

---

## PRIORITY 3 — Landing + login screens
### 3.1 — Animated landing (splash) screen
- A simple intro screen that shows for **~3 seconds** then auto-advances:
  - The logo **animates**: the growing dots connect one by one along the rising curve.
  - As it animates, the name **"Vyapaari AI"** appears, with the tagline below it: *"Bada socho, chhoti dukaan se."*
  - Keep it on the cream background, centered, minimal. After ~3s, fade into the login (or home if already logged in).

### 3.2 — Login screen
- A welcoming line guiding the user to log in (e.g. *"Namaste! Apne number se login karein."*).
- **Hindi/English toggle** in the top-right corner (consistent with the rest of the app).
- **Keep the existing hardcoded phone+OTP logic untouched** — just style it and add the welcome copy.

**Verify Priority 3:** Splash → (login if needed) → home, smooth and on-brand. Commit: `feat: animated landing + login screen`.

---

## PRIORITY 4 — Daily chat (advisor) + memory
- After onboarding, the **daily chat screen** is where the user talks normally — asks business questions or narrates an incident/story.
- Keep it **minimal and voice-first** (a mic-centric screen, not a heavy text window). A clean mic with a small transcript is enough.
- The **profiler** should silently extract and store relevant facts from these conversations into memory (the Business Brain), and the **advisor** should answer using retrieved memory + grounding. (Engine likely exists — ensure it's wired to this screen and persists.)
- This screen MAY show the example question chips as gentle prompts (the ones removed from onboarding).

**Verify Priority 4:** User can chat, advice uses remembered facts, new facts persist. Commit: `feat: daily chat + memory wiring`.

---

## PRIORITY 5 — Insight & Knowledge agents (ONLY IF TIME REMAINS)
Keep these lightweight. **Do not destabilize the working app to add them.**
- **Insight agent:** surfaces a **risk alert** when it detects a serious risk in the user's data/history. It should **pop up as a notification (a soft "tink" sound or a badge) — it must NOT auto-speak or interrupt.** Provide a **speaker icon** the user can tap to hear it. The normal advisor still gives general possibilities; the insight agent specifically flags big risks.
- **Knowledge agent:** surfaces **opportunities** (new schemes, workshops, programs relevant to the user's business) the same non-intrusive way — a notification/fact the user can tap to explore.
- Both should also be **available as buttons in a sidebar** so the user can call them on demand.
- If there's no time to build real detection, implement a **minimal but genuine version** (e.g. one rule-based risk trigger + one sample opportunity) and clearly mark it as such — never fake it in a way that misleads.

**Verify Priority 5:** Notifications appear non-intrusively, tap-to-listen works, sidebar buttons work. Commit: `feat: insight + knowledge agents (mvp)`.

---

## PRIORITY 6 — Settings & account (ONLY IF TIME REMAINS)
- A **settings page**: user can view their details and Business Brain summary.
- **Delete account** option: removes the user's account **and** their memory from the database; afterward the app returns to logged-out state and requires login again. (This can double as the cleaner version of the Priority 0.4 dev reset.)

**Verify Priority 6:** Settings shows data; delete wipes data + memory + session. Commit: `feat: settings + account deletion`.

---

## If you run out of time
Stop at the **last completed, verified priority**, ensure `npm run dev` works, commit, and write a short note in the README listing: what's working, what's mocked, what's not yet built. A clean working app at Priority 2 beats a broken one at Priority 6.

## Final checklist before we record the demo
- [ ] Log in works; can reach onboarding
- [ ] Onboarding: greeting auto-plays, short questions, progress shows, **resume-after-back works**, no auto-restart
- [ ] **Hindi stays Hindi** — no auto-switch to English/Urdu, no rejection
- [ ] Latency is acceptable; no freezing/overlap
- [ ] Branding applied, minimal and clean
- [ ] Navigation works (no dead ends)
- [ ] Dev reset works so we can re-test for the video
- [ ] App still runs after all changes
