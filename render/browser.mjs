// Shared Chromium launcher: prefers Playwright's own download, falls back to any installed ms-playwright build.
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ARGS = process.env.SOFTWARE_GL ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-webgl", "--use-angle=default"];

export async function launch() {
  try { return await chromium.launch({ args: ARGS }); } catch {}
  try { return await chromium.launch({ channel: "chromium", args: ARGS }); } catch {}
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  const dirs = existsSync(root) ? readdirSync(root).filter((d) => d.startsWith("chromium-")).sort().reverse() : [];
  for (const d of dirs) {
    for (const exe of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
      const p = path.join(root, d, exe);
      if (existsSync(p)) return chromium.launch({ executablePath: p, args: ARGS });
    }
  }
  throw new Error("No Chromium found — run: npx playwright install chromium");
}
