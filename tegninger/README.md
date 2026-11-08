# Lindsetvegen 19 – tegninger, stålbjelker IPE 180 i 1. etasje

`Lindsetvegen_19_-_tegninger_stalbjelker_3_ark_rev_10.pdf` – tre A4-ark (liggende):

1. Plan 1. etasje – utsnitt, 1:50
2. Snitt langs B1 – kjøkkenbjelke, 1:25
3. Snitt langs B2 – gangbjelke, 1:25

Rev. 10 har ny layout. Mål, tekster og beregninger er de samme som i rev. 9.

## Lage PDF-en på nytt

```sh
python3 generate.py          # -> build/tegninger.html
node render.cjs              # -> PDF (krever Playwright med Chromium)
node render.cjs build/x.pdf --png   # valgfritt filnavn + PNG-forhåndsvisning
```

All geometri, tekst og alle tall ligger i `generate.py`. Fonten er Inter (SIL OFL, se `fonts/OFL.txt`).
