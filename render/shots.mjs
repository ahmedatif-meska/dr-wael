// QA screenshots at several widths. Usage: node render/shots.mjs [baseUrl]
import { launch } from "./browser.mjs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] || "http://localhost:5178/";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "shots");
await mkdir(OUT, { recursive: true });

const browser = await launch();
for (const [w, h] of [[1440, 900], [1280, 800], [768, 1024], [375, 812]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: path.join(OUT, `hero-${w}.png`) });
  const sel = async (s, name, extra = 0) => {
    await page.evaluate(([s, extra]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + extra); }, [s, extra]);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`) });
  };
  await sel("#pillars", "pillars");
  await sel("#journey", "journey", h * 1.2);
  await sel("#expertise", "expertise");
  await sel("#training", "training");
  await sel("#contact", "contact");
  console.log(`${w}x${h}: done${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
  await page.close();
}
await browser.close();
