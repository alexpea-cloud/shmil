# SHMIL – Fra tilsynsavvik til søknad

Animert dokumentarfilm (2:30, 16:9, Full HD) om SHMILs oppfølging av tilsynsavviket fra
Statsforvalteren i Nordland: korrespondansen med Miljødirektoratet, og søknaden om
tidsbegrenset unntak etter avfallsforskriften § 19-4 for glass- og metallemballasje.
Filmen er laget for å vises i PowerPoint for representanter fra SHMILs 11 eierkommuner.

**Ferdig film:** [`output/SHMIL_fra_tilsynsavvik_til_soknad.mp4`](../output/SHMIL_fra_tilsynsavvik_til_soknad.mp4)
(H.264/AAC, 1920×1080, 30 fps, lydspor «Tactical Stillness»)

## Innhold

| Tid | Kapittel | Innhold |
|-----|----------|---------|
| 0:00 | Åpning | Tittel over de faktiske dokumentsidene |
| 0:09 | 01 Tilsyn og oppfølging | 6.11.2025: tilsynsavvik – krav om henteordning (papp/papir og glass/metall). 9.–10.12.2025: plukkanalysen gjennomføres (Iris Produksjon) |
| 0:35 | 02 Henvendelse | SHMILs brev 15.01.2026: dato, overskrift, «metoden eller miljøgevinsten», samlet vurdering, 99,8 % spredtbygd, fergetid – og oversikt over 7 sider / 3 tema / 6 spørsmål |
| 1:02 | 03 Avklaring | Miljødirektoratets svar 07.05.2026 (mottatt 19.01, foreløpig svar 26.02): henteplikten gjelder i utgangspunktet, **§ 19-4** som vendepunkt, høy terskel, «ikke tilstrekkelig informasjon» – en prinsipiell avklaring, ikke et avslag |
| 1:33 | 04 Dokumentasjon | Sommeren 2026: Vedlegg 1, Vedlegg 2 og søknadens beregninger på en arbeidsflate. Målte tall (44 returpunkter, 579,5 tonn, 93,9 % fra plukkanalysen des. 2025) holdes tydelig adskilt fra modellscenarier (ca. 56 000 tømmestopp, 45,7 tonn, 3,39 mill. kr/år) |
| 2:04 | 05 Søknad | Søknaden 31.08.2026: fiberdunk for papp/papir, unntakssøknad for glass/metall frem til 31.12.2030, samlet pakke med Vedlegg 1 og 2 oversendt |
| 2:20 | Avslutning | «SHMIL søker om tidsbegrenset unntak etter § 19-4» – hele tidslinjen november 2025 – august 2026 |

Filmen fungerer uten lyd: all informasjon står som tekst på skjermen.

## Bruk i PowerPoint

1. **Sett inn → Video → Denne enheten…** og velg MP4-filen.
2. Under **Avspilling**: velg *Start: Automatisk* (eller *Ved klikk*) og eventuelt *Spill av i fullskjerm*.
3. Filmen er 2 min 30 s og slutter i svart.

## Slik er filmen laget

Alt i filmen er bygget fra de opplastede PDF-ene – sidene vises som originale faksimiler
(gjengitt fra PDF-ene i 300 dpi), og alle uthevinger er plassert på ordenes faktiske
koordinater i dokumentene. Statsforvalterens tilsynsrapport var ikke vedlagt, så den vises
ikke; avviket gjengis som tekst med kildehenvisning til SHMILs brev av 15.01.2026.

```
film/
  index.html      animasjonen (åpne i Chrome for forhåndsvisning med lyd og tidslinje)
  film.js         all animasjon – hvert bilde er en funksjon av tid
  data.js         ordposisjoner for uthevinger (generert fra PDF-ene)
  render.cjs      gjengir filmen bilde for bilde (Playwright) og koder MP4 (ffmpeg)
  assets/         sidebilder, SHMIL-logo (fra brevarket), skrifter (Inter, JetBrains Mono – OFL), lydspor
  source/         de fem original-PDF-ene
  tools/          hl.py + specs.json: finner tekstpassasjer i PDF-ene
output/
  SHMIL_fra_tilsynsavvik_til_soknad.mp4
```

### Forhåndsvise og eksportere på nytt

```bash
cd film
open index.html                 # forhåndsvisning i nettleser (play/pause og spoling nederst)
npm install                     # installerer Playwright (krever også ffmpeg)
npx playwright install chromium
node render.cjs                 # skriver output/SHMIL_fra_tilsynsavvik_til_soknad.mp4
node render.cjs --stills 82,112 # enkeltbilder til output/stills/
```

Tekster, tidspunkter og kamerabevegelser endres i `film.js`. Nye uthevinger legges inn i
`tools/specs.json` og genereres slik (krever poppler-utils):

```bash
mkdir -p /tmp/shmil/bbox
for d in brev svar sok v1 v2; do pdftotext -bbox-layout source/$d.pdf /tmp/shmil/bbox/$d.html; done
python3 tools/hl.py /tmp/shmil tools/specs.json tools/highlights.json data.js
```
