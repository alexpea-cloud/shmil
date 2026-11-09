#!/bin/bash
# Builds the full film (v5) from its parts:
#   demos/kart.html (opening) · index.html/film.js · demos/grunnlag3d.html (3D) · demos/innbygger.html (sequence B)
# Each part is rendered to JPEG frames, joined with 1 s cross-dissolves, and encoded with the edited soundtrack.
# Usage: bash tools/build_film.sh [out.mp4]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-../output/SHMIL_grunnlaget_for_soknaden.mp4}
F=../output
seg() { # name page from to [extra args]
  local name=$1 page=$2 from=$3 to=$4; shift 4
  if [ -n "${SKIP:-}" ] && [[ " $SKIP " == *" $name "* ]]; then echo "skip $name"; return; fi
  node render.cjs --page "$page" --from "$from" --to "$to" --frames-only --out "$F/$name.mp4" "$@"
}
if [ "${ENCODE_ONLY:-0}" != 1 ]; then
seg s1_kart demos/kart.html 0 20.3 --query film=1
seg s2_film index.html 19.3 110.3
seg s3_3d demos/grunnlag3d.html -0.5 27.9 --query 'film=1&dur=27.4' --webgl --workers 2
seg s5_b demos/innbygger.html -0.5 50.5 --query film=1
seg s6_film index.html 186.7 222.3
python3 -I tools/join_frames.py "$F" 222.3
fi
# soundtrack: the original with four bars (124.8–132.3 s) taken out so the climax lands on «22 gram i uka»,
# then the calm opening theme as a bookend (bar-aligned, 128 bpm)
AUDIO=assets/audio/cosmos-18-remix.mp3
ffmpeg -y -v error -stats -framerate 30 -i "$F/frames-final/f%05d.jpg" -i "$AUDIO" -i "$AUDIO" -i "$AUDIO" \
  -filter_complex "[1:a]atrim=0:125.0,asetpts=PTS-STARTPTS[a];[2:a]atrim=132.1:200.0,asetpts=PTS-STARTPTS[b];[3:a]atrim=4.6:34.8,asetpts=PTS-STARTPTS[c];[a][b]acrossfade=d=0.4:c1=tri:c2=tri[ab];[ab][c]acrossfade=d=0.4:c1=tri:c2=tri,afade=t=out:st=219.3:d=3[au]" \
  -map 0:v -map "[au]" -c:v libx264 -preset slow -crf 22 -aq-mode 3 -pix_fmt yuv420p -profile:v high -level 4.1 -r 30 \
  -x264-params keyint=60:min-keyint=30 -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
echo "wrote $OUT"
