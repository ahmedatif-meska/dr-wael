"""Background removal for the hero portrait. Produces alpha only; RGB pixels are untouched."""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "wael-standing.jpg"
OUT = ROOT / "assets" / "wael-standing-cutout.png"
OUT2X = ROOT / "assets" / "wael-standing-cutout@2x.png"

src = Image.open(SRC).convert("RGB")
session = new_session("isnet-general-use")
mask = remove(src, session=session, only_mask=True, alpha_matting=True,
              alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=10,
              alpha_matting_erode_size=8).convert("L")

# Tighten the matte: 1px erode, 1.5px feather, keep interior fully opaque.
m = np.asarray(mask).astype(np.float32) / 255.0
mask = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
m = np.asarray(mask).astype(np.float32) / 255.0
m = np.clip((m - 0.08) / 0.84, 0, 1)

rgba = np.dstack([np.asarray(src), (m * 255).astype(np.uint8)])
out = Image.fromarray(rgba, "RGBA")

# Crop to the opaque bounding box with a small margin.
bbox = out.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
pad = 12
bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, out.width), min(bbox[3] + pad, out.height))
out = out.crop(bbox)
out.save(OUT, optimize=True)
out.resize((out.width * 2, out.height * 2), Image.LANCZOS).save(OUT2X, optimize=True)
print("saved", OUT, out.size, "and", OUT2X.name)
