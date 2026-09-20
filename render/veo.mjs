// Generates the environment clips with Veo 3.1 through the Gemini API.
// Usage: GEMINI_API_KEY=... node render/veo.mjs [id ...]   (no ids = all)
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("GEMINI_API_KEY is not set"); process.exit(1); }

const API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.VEO_MODEL || "veo-3.1-generate-preview";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "raw");

const SUFFIX = " Photoreal, cinematic, anamorphic lens, extremely slow camera movement, dark charcoal and black stone, glass surfaces, brushed copper rim light, deep shadows, subtle film grain, no people, no faces, no text, no letters, no logos, no charts, no holograms, no science-fiction interface, no lens flares.";
const NEGATIVE = "people, person, face, hands, text, letters, numbers as typography, logo, chart, graph, hologram, HUD, neon, sci-fi, lens flare, watermark, cartoon, blur";

const CLIPS = {
  "v01-architecture": { aspect: "16:9", prompt: "Monumental interior of a dark financial institution: a vast hall of black polished stone and floor-to-ceiling glass, tall rectangular volumes rising from the floor like physical bar structures of different heights, thin copper light grazing their edges, faint reflections in the stone floor, extremely slow forward camera push, controlled darkness with one warm light source far ahead." },
  "v01-vertical": { aspect: "9:16", prompt: "Monumental interior of a dark financial institution: a vast hall of black polished stone and floor-to-ceiling glass, tall rectangular volumes rising from the floor like physical bar structures of different heights, thin copper light grazing their edges, faint reflections in the stone floor, extremely slow forward camera push, controlled darkness with one warm light source far ahead, vertical composition." },
  "v02-journey": { aspect: "16:9", prompt: "A very long architectural corridor of dark stone and glass receding into the distance, a sequence of tall illuminated gates spaced evenly along it like chronological markers, each gate edged in warm copper light, controlled directional light from the far end, slow steady dolly forward through the corridor, symmetrical composition." },
  "v03-clarity": { aspect: "16:9", prompt: "Thousands of small dark glass blocks suspended in a black void in chaotic disorder, slowly drifting and rotating into a perfectly ordered three-dimensional lattice, scattered copper light resolving into aligned parallel beams as the structure settles, extremely slow camera orbit, precision and calm." },
  "v04-wsfa": { aspect: "16:9", prompt: "Massive dark dimensional slabs of black stone and smoked glass sliding and aligning into one coherent monumental system, composition weighted to the right side with clear empty dark negative space on the left third, thin copper light along the seams, extremely slow camera push." },
  "v05-closing": { aspect: "16:9", prompt: "Monumental modern architecture of black stone and glass seen from inside, camera slowly moving toward tall windows as darkness gives way to controlled warm morning light entering the space, long soft shadows, calm and confident atmosphere, extremely slow push toward the light." },
};

const headers = { "x-goog-api-key": KEY, "content-type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function start(id, clip) {
  const body = {
    instances: [{ prompt: clip.prompt + SUFFIX }],
    parameters: { aspectRatio: clip.aspect, resolution: "1080p", durationSeconds: 8, negativePrompt: NEGATIVE },
  };
  const res = await fetch(`${API}/models/${MODEL}:predictLongRunning`, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${id}: ${res.status} ${JSON.stringify(json.error || json)}`);
  return json.name;
}

async function poll(id, op) {
  for (let i = 0; i < 120; i++) {
    await sleep(10000);
    const res = await fetch(`${API}/${op}`, { headers });
    const json = await res.json();
    if (json.error) throw new Error(`${id}: ${JSON.stringify(json.error)}`);
    if (json.done) {
      const r = json.response || {};
      if (r.raiMediaFilteredCount) throw new Error(`${id}: filtered by safety (${JSON.stringify(r.raiMediaFilteredReasons)})`);
      const sample = r.generateVideoResponse?.generatedSamples?.[0] || r.generatedSamples?.[0] || r.videos?.[0];
      const uri = sample?.video?.uri || sample?.uri;
      if (!uri) throw new Error(`${id}: no video uri in ${JSON.stringify(r).slice(0, 400)}`);
      return uri;
    }
    process.stdout.write(`\r${id}: rendering… ${(i + 1) * 10}s`);
  }
  throw new Error(`${id}: timed out`);
}

async function download(id, uri) {
  const res = await fetch(uri, { headers: { "x-goog-api-key": KEY } });
  if (!res.ok) throw new Error(`${id}: download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(OUT, `${id}.mp4`);
  await writeFile(file, buf);
  console.log(`\n${id}: saved ${file} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

await mkdir(OUT, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
const ops = [];
let startFailed = 0;
for (const id of ids) {
  if (!CLIPS[id]) { console.error(`unknown clip ${id}`); continue; }
  if (existsSync(path.join(OUT, `${id}.mp4`)) && !process.env.FORCE) { console.log(`${id}: exists, skip`); continue; }
  try { ops.push([id, await start(id, CLIPS[id])]); console.log(`${id}: started`); }
  catch (e) { startFailed++; console.error(e.message); }
}
let failed = startFailed;
for (const [id, op] of ops) {
  try { await download(id, await poll(id, op)); }
  catch (e) { failed++; console.error(`\n${e.message}`); }
}
process.exit(failed ? 1 : 0);
