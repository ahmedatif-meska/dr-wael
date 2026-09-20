#!/usr/bin/env bash
# Stitches rendered frames into MP4/WebM and transcodes Veo clips for the site.
# Usage: bash render/make-video.sh [frames|veo|all]
set -euo pipefail
cd "$(dirname "$0")/.."
mode="${1:-all}"
out="assets/video"
mkdir -p "$out"

stitch () { # name
  local name="$1" dir="render/frames/$1"
  [ -d "$dir" ] || { echo "no frames for $name"; return; }
  ffmpeg -y -loglevel error -framerate 60 -i "$dir/%05d.png" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart "$out/$name.mp4"
  ffmpeg -y -loglevel error -framerate 60 -i "$dir/%05d.png" -c:v libvpx-vp9 -b:v 0 -crf 30 -pix_fmt yuv420p "$out/$name.webm"
  echo "→ $out/$name.mp4 / .webm"
}

if [ "$mode" = "frames" ] || [ "$mode" = "all" ]; then
  [ -d render/frames/hero ] && { stitch hero && mv "$out/hero.mp4" "$out/hero-intro.mp4" && mv "$out/hero.webm" "$out/hero-intro.webm"; ffmpeg -y -loglevel error -sseof -0.1 -i "$out/hero-intro.mp4" -frames:v 1 -q:v 2 "$out/hero-intro-poster.jpg"; }
  [ -d render/frames/social ] && { stitch social && mv "$out/social.mp4" "$out/social-15s.mp4" && mv "$out/social.webm" "$out/social-15s.webm"; }
  [ -d render/frames/vertical ] && { stitch vertical && mv "$out/vertical.mp4" "$out/social-9x16.mp4" && mv "$out/vertical.webm" "$out/social-9x16.webm"; }
fi

if [ "$mode" = "veo" ] || [ "$mode" = "all" ]; then
  manifest="{"
  for f in render/raw/v0*.mp4; do
    [ -e "$f" ] || continue
    id="$(basename "$f" .mp4)"
    # silent, loop-safe (0.6 s crossfade tail), 1080p + 720p, H.264 + VP9, poster from mid clip
    ffmpeg -y -loglevel error -i "$f" -an -filter_complex "[0:v]split[a][b];[a]trim=0:7.4,setpts=PTS-STARTPTS[a1];[b]trim=7.4:8,setpts=PTS-STARTPTS[b1];[a1][b1]xfade=transition=fade:duration=0.6:offset=6.8[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 23 -preset slow -movflags +faststart "$out/$id.mp4"
    ffmpeg -y -loglevel error -i "$out/$id.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 33 -pix_fmt yuv420p "$out/$id.webm"
    ffmpeg -y -loglevel error -i "$out/$id.mp4" -an -vf scale=-2:720 -c:v libx264 -pix_fmt yuv420p -crf 25 -movflags +faststart "$out/$id-720.mp4"
    ffmpeg -y -loglevel error -i "$out/$id.mp4" -an -vf scale=-2:720 -c:v libvpx-vp9 -b:v 0 -crf 35 -pix_fmt yuv420p "$out/$id-720.webm"
    ffmpeg -y -loglevel error -ss 3 -i "$out/$id.mp4" -frames:v 1 -q:v 3 "$out/$id-poster.jpg"
    manifest="$manifest\"$id\":{\"mp4\":\"$id.mp4\",\"webm\":\"$id.webm\",\"mp4720\":\"$id-720.mp4\",\"webm720\":\"$id-720.webm\",\"poster\":\"$id-poster.jpg\"},"
    echo "→ $id"
  done
  manifest="${manifest%,}}"
  echo "$manifest" > "$out/manifest.json"
  echo "→ $out/manifest.json"
fi
