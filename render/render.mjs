// Frame-steps the site's GSAP intro (and the journey travel) at 60 fps and writes PNG frames.
// Usage: node render/render.mjs [baseUrl] [--cut hero|social|vertical]
// Then: bash render/make-video.sh
import { launch } from "./browser.mjs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) || "http://localhost:5178/";
const cut = args[args.indexOf("--cut") + 1] || "hero";
const FPS = 60;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "frames", cut);
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const vertical = cut === "vertical";
// Vertical uses the mobile layout at 2× so the output is still 1080×1920.
const viewport = vertical ? { width: 540, height: 960 } : { width: 1920, height: 1080 };
const browser = await launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: vertical ? 2 : 1 });
await page.goto(base + "?render=1", { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true && !!window.__introTl, null, { polling: 100, timeout: 60000 });
await page.waitForTimeout(2500); // fonts + WebGL mount

let frame = 0;
const shoot = async () => {
  await page.screenshot({ path: path.join(OUT, `${String(frame++).padStart(5, "0")}.png`), animations: "allow", caret: "initial", timeout: 20000 });
  if (frame % 30 === 0) console.log(`${cut}: frame ${frame}`);
};
console.log(`${cut}: page ready, capturing…`);

// Scene A: intro timeline (6 s)
const introSeconds = 6;
for (let i = 0; i <= introSeconds * FPS; i++) {
  const t = Math.min(i / FPS, await page.evaluate(() => window.__introTl.duration()));
  await page.evaluate((t) => { window.__introTl.time(t); }, t);
  await page.waitForTimeout(8);
  await shoot();
}

if (cut === "social") {
  // Scene B: journey fly-through (5 s) — bring the section into view, then travel sideways by progress.
  await page.evaluate(() => { const el = document.querySelector("#journey"); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40); ScrollTrigger.update(); });
  await page.waitForTimeout(600);
  for (let i = 0; i <= 5 * FPS; i++) {
    const p = i / (5 * FPS);
    const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    await page.evaluate((e) => { window.__journeySet && window.__journeySet(e); }, e);
    await page.waitForTimeout(8);
    await shoot();
  }
  // Scene C: client wall + end card (4 s)
  await page.evaluate(() => { const el = document.querySelector("#clients"); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80); ScrollTrigger.update(); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 2 * FPS; i++) { await page.waitForTimeout(8); await shoot(); }
  await page.evaluate(() => {
    const card = document.createElement("div");
    card.id = "endcard";
    card.style.cssText = "position:fixed;inset:0;z-index:999;background:#0B0D10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#F2F3F5;font-family:'Space Grotesk',sans-serif;opacity:0;transition:opacity .8s";
    card.innerHTML = `<div style="font-size:64px;font-weight:700;letter-spacing:-.02em">Dr. Wael Samir</div><div style="font-family:'IBM Plex Mono',monospace;color:#E0B27A;letter-spacing:.14em;font-size:20px">DBA · MBA · CMA · FOUNDER &amp; CEO, WSFA FINANCIAL ADVISORY</div><div style="color:#A3A9B3;font-size:28px;margin-top:24px">Turning financial complexity into strategic clarity.</div><div style="font-family:'IBM Plex Mono',monospace;font-size:22px;margin-top:40px">WhatsApp +20 12 2627 0170</div>`;
    document.body.append(card);
    requestAnimationFrame(() => (card.style.opacity = "1"));
  });
  for (let i = 0; i < 2 * FPS; i++) { await page.waitForTimeout(8); await shoot(); }
}

await browser.close();
console.log(`${cut}: ${frame} frames → ${OUT}`);
