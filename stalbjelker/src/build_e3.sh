#!/usr/bin/env bash
# build_e3.sh – bygger de tre forenklede arkene (plan + ett ark per bjelke) og slår dem sammen til én PDF.
# Bruk: ./build_e3.sh [ut-mappe]   (standard: ../leveranse/kortpakke)
set -euo pipefail
cd "$(dirname "$0")"
OUT=${1:-../leveranse/kortpakke}
B=../build
mkdir -p "$OUT" "$B"
[ -f results.json ] || python3 calc.py > "$B/calc.log"
for n in 1 2 3; do
  DRAWCHECK=1 python3 "kort$n.py" "$B/E3-$n.svg"
done
node render.js "$B" "$B/E3-1.svg" "$B/E3-2.svg" "$B/E3-3.svg" --png-scale=2 >/dev/null
PFX=$(python3 -c "import json,os;p='../privat/prosjekt.json';print(json.load(open(p))['filprefiks'] if os.path.exists(p) else 'Stålbjelker')")
VED=$(python3 -c "import json,os;p='../privat/prosjekt.json';print(json.load(open(p)).get('vedlegg_tegninger','E3') if os.path.exists(p) else 'E3')")
python3 - "$B" "$OUT/$PFX – 4 tegninger stålbjelker (vedlegg $VED).pdf" "$PFX" <<'PY'
import sys
from pypdf import PdfWriter, PdfReader
b, out, pfx = sys.argv[1], sys.argv[2], sys.argv[3]
w = PdfWriter()
for n in (1, 2, 3):
    for p in PdfReader(f"{b}/E3-{n}.pdf").pages:
        w.add_page(p)
w.add_metadata({"/Title": f"{pfx} – stålbjelker B1 og B2, plan og snitt",
                "/Subject": "Prinsippskisse som utført 2018 – plan 1:50 og snitt 1:20 (A3)"})
w.write(out)
print("skrev", out)
PY
