# Lindsetvegen 19 – stålbjelker IPE 180 i 1. etasje

Vedlegg til svaret til Vefsn kommune, sak 2023/6670 (gnr. 199 bnr. 9):

| Vedlegg | Fil | Innhold |
|---|---|---|
| E3–E5 | `Lindsetvegen_19_-_E3-E5_tegninger_stalbjelker_rev_A.pdf` | Plan 1:50 og snitt langs B1 og B2 1:25 (A4 liggende), rev. A – første utgave |
| F2 | `Lindsetvegen_19_-_F2_notat_stalbjelker.docx` | Notat: hva som ble gjort, hvordan bjelkene står, valg av bjelker, medhjelpere og bekreftelse (Word) |
| F3 | `Lindsetvegen_19_-_F3_beregning_stalbjelker.pdf` | Beregning av stålbjelkene, 1 side, med bekreftelseslinje for Jan Sandbukt |

Notatet (F2) inneholder et familiebilde og holdes derfor utenfor git sammen med `bilder/`.
Det lages på nytt med `node notat.cjs`, når bildet ligger i `bilder/montering_B2_2018.jpg`.

## Lage filene på nytt

```sh
python3 generate.py          # -> build/tegninger.html og build/beregning.html
node render.cjs              # -> E3–E5 og F3 som PDF (krever Playwright med Chromium)
node notat.cjs               # -> F2 som Word-fil (krever npm-pakken docx)
```

All geometri, tekst og alle tall for tegninger og beregning ligger i `generate.py`; notatteksten ligger
i `notat.cjs`. Fonten i PDF-ene er Inter (SIL OFL, se `fonts/OFL.txt`).
