#!/usr/bin/env bash
# build.sh – bygger hele leveransen fra kildene: beregning -> tegninger (PDF) -> figurer -> dokumenter (DOCX + PDF).
set -euo pipefail
cd "$(dirname "$0")"
OUT=../leveranse
B=../build
mkdir -p "$OUT" "$B/fig"
SOFFICE=${SOFFICE:-soffice}          # kan settes til f.eks. "python3 /sti/til/soffice.py"

python3 calc.py > "$B/calc.log"
python3 sheet1.py "$B/S-01.svg" >/dev/null
python3 sheet2.py "$B/S-02.svg" >/dev/null
python3 sheet3.py "$B/S-03.svg" >/dev/null
node render.js "$B" "$B/S-01.svg" "$B/S-02.svg" "$B/S-03.svg" --png-scale=2 >/dev/null
python3 figs.py "$B/fig" >/dev/null
node render.js "$B/fig" "$B/fig/fig_b1.svg" "$B/fig/fig_b2.svg" "$B/fig/fig_snow.svg" "$B/fig/fig_path.svg" --png-scale=3.2 >/dev/null

PFX=$(python3 -c "import json,os;p='../privat/prosjekt.json';print(json.load(open(p))['filprefiks'] if os.path.exists(p) else 'Stålbjelker')")
T="$OUT/$PFX – tegninger stålbjelker (3 ark, rev 11).pdf"
python3 - "$B" "$T" "$PFX" <<'PY'
import sys
from pypdf import PdfWriter, PdfReader
b, out = sys.argv[1], sys.argv[2]
w = PdfWriter()
for n in ("S-01", "S-02", "S-03"):
    for p in PdfReader(f"{b}/{n}.pdf").pages:
        w.add_page(p)
w.add_metadata({"/Title": f"{sys.argv[3]} – stålbjelker B1 og B2, tegning S-01 til S-03, rev. 11",
                "/Subject": "Prinsippskisse som utført 2018 – plan 1:50, snitt 1:20, detaljer 1:10 (A3)"})
w.write(out)
PY

doc() {   # doc <generator.js> <filnavn uten endelse>
  node "$1" "$OUT/$2.docx" >/dev/null
  (cd "$OUT" && zip -q -d "$2.docx" '*/' >/dev/null 2>&1 || true)
  (cd "$OUT" && $SOFFICE --headless --convert-to pdf "$2.docx" >/dev/null 2>&1)
}
doc notat.js "$PFX – beregningsnotat stålbjelker (rev 11)"
# Brev, redegjørelse og mangelliste inneholder personopplysninger og ligger i ../privat (ikke versjonskontrollert).
if [ -f ../privat/redegjorelse.js ]; then
  doc ../privat/redegjorelse.js "$PFX – redegjørelse utførelse og medhjelperkompetanse (utkast)"
  doc ../privat/brev.js         "$PFX – utkast svar til kommunen"
  doc ../privat/mangelliste.js  "$PFX – dokumentasjon som gjenstår"
  [ -f ../privat/frist.js ] && doc ../privat/frist.js "$PFX – utkast anmodning om utsatt frist"
fi
ls -la "$OUT"
