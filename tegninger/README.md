# Lindsetvegen 19 – stålbjelker IPE 180 i 1. etasje

- `Lindsetvegen_19_-_tegninger_stalbjelker_3_ark_rev_10.pdf` – tre A4-ark (liggende):
  1. Plan 1. etasje – utsnitt, 1:50
  2. Snitt langs B1 – kjøkkenbjelke, 1:25
  3. Snitt langs B2 – gangbjelke, 1:25
- `Lindsetvegen_19_-_notat_stalbjelker_rev_10.pdf` – notat på én side (A4 stående) som beskriver
  opplegg, laster, avstivning og forutsetninger for tegningene.

Rev. 10 har ny layout. Tegningene viser geometri, mål og beregningsresultat. Forklaringene som før
sto på tegningene, står nå i notatet. Kontrollen av søyleopplegget er tatt ut (klarert).

## Lage PDF-ene på nytt

```sh
python3 generate.py          # -> build/tegninger.html og build/notat.html
node render.cjs              # -> begge PDF-ene (krever Playwright med Chromium)
node render.cjs --png        # gir også PNG-forhåndsvisninger i build/
```

All geometri, tekst og alle tall ligger i `generate.py`. Fonten er Inter (SIL OFL, se `fonts/OFL.txt`).
