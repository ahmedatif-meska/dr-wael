# Dr. Wael Samir — cinematic portfolio (site-premium)

Static site: `index.html`, `styles.css`, `script.js`, `webgl/`, `data/profile.json`, `assets/`. No build step.
Serve the folder with any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) or locally with `npx serve .`.

All content comes from `data/profile.json`, which was transcribed from *Wael Samir profile 2026.pdf* only. Edit the JSON to change copy; the sections re-render from it.

## Before going live — three things to paste in

1. **Contact form delivery.** Create a free access key at https://web3forms.com (enter the inbox that should receive inquiries), then paste it into `script.js` where it says `WEB3FORMS_KEY = "YOUR-WEB3FORMS-ACCESS-KEY"`. Until then the form shows a real "could not send" error and points people to WhatsApp — it never fakes success.
2. **Social image.** Replace `assets/og.jpg` (1200×630) — a still from the hero works.
3. **Rotate the Google API key** that was used for Veo during the build. It was shared in chat and should be regenerated in Google AI Studio after delivery.

## Environment videos (Veo 3.1)

The five background clips are optional; the site ships with WebGL/CSS environments and switches to video automatically when the files exist.

The Google project behind the supplied key returned `429 RESOURCE_EXHAUSTED` — Veo needs a **paid** Gemini API tier. Once billing is enabled on that project:

```bash
export GEMINI_API_KEY=...           # never commit it
node render/veo.mjs                 # generates render/raw/v0*.mp4 (≈ 6 × 8 s, ~$15–30)
bash render/make-video.sh veo       # transcodes to assets/video/ + writes manifest.json
```

Prompts and art direction are in `render/prompts.md`. Review each clip; re-run a single id with `FORCE=1 node render/veo.mjs v03-clarity`.

## Rendered videos (hero intro + social cuts)

```bash
npx serve . -l 5178                 # in one terminal
node render/render.mjs --cut hero      # 6 s, 1920×1080
node render/render.mjs --cut social    # 15 s: intro + journey fly-through + client wall + end card
node render/render.mjs --cut vertical  # 1080×1920
bash render/make-video.sh frames    # → assets/video/hero-intro.mp4/.webm, social-15s, social-9x16
```

Requires `npm i` (Playwright) and `npx playwright install chromium`, plus ffmpeg on PATH. Frames are stepped deterministically from the same GSAP timeline the site uses, so the video always matches the live hero.

## QA

`node render/shots.mjs` writes screenshots at 1440 / 1280 / 768 / 375 to `render/shots/` and prints console errors.
Flags for manual testing: `?motion=off` (reduced-motion path), `?webgl=off` (CSS fallbacks), `?render=1` (render mode).

## Case studies (later)

Each entry in `profile.json → journey[]` has a `caseStudy: null` slot. When Dr. Wael supplies validated facts, fill `{ "situation": "...", "approach": "...", "outcome": "..." }` and the Selected Experience cards render them automatically. Nothing is invented in the meantime.

## Photo

`assets/wael-standing-cutout.png` was produced by `render/cutout.py` (rembg, alpha only — pixels of the person are untouched). Re-run it if a new photo arrives: `python render/cutout.py`.
