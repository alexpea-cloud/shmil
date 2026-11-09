# SHMIL – Grunnlaget for søknaden

Animert dokumentarfilm (3:42, 16:9, Full HD) om arbeidet bak SHMILs søknad om tidsbegrenset
unntak etter avfallsforskriften § 19-4: hvordan dokumentasjonen ble hentet inn fra arkiver og
fagsystemer, analysert og sammenstilt i Vedlegg 1 og 2, og hvordan søknaden bygger på den.
Laget for visning i PowerPoint for representanter fra SHMILs 11 eierkommuner.

**Ferdig film:** [`output/SHMIL_grunnlaget_for_soknaden.mp4`](../output/SHMIL_grunnlaget_for_soknaden.mp4)
(H.264/AAC, 1920×1080, 30 fps, 3:42, lydspor «Cosmos 18 (Remix)», forlenget med åpningstemaet)

## Disposisjon (versjon 5, 3:42)

Rolig regi: ett budskap om gangen, få ord, lange hold. Høydepunktet i musikken treffer «22 gram i uka».

| Tid | Del | Innhold |
|-----|-----|---------|
| 0:00 | Åpning | «Grunnlaget for søknaden» · Statsforvalteren i Nordland førte tilsyn med Brønnøy kommune etter avfallsforskriften kapittel 10a · samme ordning i alle de 11 eierkommunene (Kartverket) |
| 0:20 | Avviket | Statsforvalteren 6.11.2025 · sorteringsmerkene for papp/papir og glass/metall · «Henteordning mangler» |
| 0:35 | Brevvekslingen | SHMILs brev 15. januar 2026 (7 sider · 6 spørsmål) og svaret 7. mai 2026 – to av svarene var avgjørende |
| 0:50 | Spørsmål og svar 1c | «Plikten til henteordning gjelder uavhengig av målkravet …» |
| 1:05 | Spørsmål og svar 3a | «Kommunenes plikter … gjelder uavhengig av pliktene til produsentansvaret.» |
| 1:20 | Til slutt: § 19-4 | «… slår urimelig ut», «… det skal mye til», «ikke tilstrekkelig informasjon» · «Grunnlaget manglet.» |
| 1:50 | Grunnlaget | 3D: fire fundamentblokker, de 31 originalsidene faller og legger seg i tre bunker |
| 2:17 | Én innbygger | 22 gram i uka per innbygger · konsekvensen av henteordning på kartet (tre biler, ferjer til Vega, Herøy og Dønna, 56 000 stopp, utslipp, støy) · 3,39 mill. kr i året |
| 3:07 | Konklusjonen | Boksen på søknadens side 1 · 74 286 kr per ekstra tonn – over 40 ganger direktoratets eget anslag |
| 3:21 | Søknaden sendt | 31.08.2026 · fiberdunk for papp/papir · søknad om unntak til 2030 |
| 3:32 | Avslutning | Tidslinjen · «Vi venter på svar.» |

Filmen settes sammen av `tools/build_film.sh` fra fire sider: `demos/kart.html`, `index.html` (film.js),
`demos/grunnlag3d.html` og `demos/innbygger.html`, med ett sekunds overtoninger. Kjørerutene og
gatenettet i kartsekvensen er illustrasjoner; sorteringsmerkene er gjenskapt etter de nasjonale merkene.

Alle tall og sitater er hentet ordrett fra de fem PDF-ene i `source/`, og alle dokumentsider er
originalsidene. Tilsynsrapporten var ikke vedlagt og vises ikke. Beregningskjeden følger Vedlegg 1
kap. 3 og søknaden kap. 2.2; hvert ledd er merket med datastatus slik vedlegget gjør.

## Bruk i PowerPoint

1. **Sett inn → Video → Denne enheten…** og velg MP4-filen.
2. Under **Avspilling**: *Start: Automatisk* eller *Ved klikk*, eventuelt *Spill av i fullskjerm*.

## Slik er filmen laget

```
film/
  index.html      animasjonen – åpne i Chrome for forhåndsvisning med lyd, spoling og fullskjerm
  film.js         all animasjon; hvert bilde er en funksjon av tid
  data.js         ordposisjoner for uthevinger (generert fra PDF-ene)
  render.cjs      gjengir filmen bilde for bilde (Playwright) og koder MP4 (ffmpeg)
  assets/         sidebilder fra PDF-ene, SHMIL-logo fra brevarket, skrifter (Inter, JetBrains Mono – OFL), lydspor
  source/         de fem original-PDF-ene
  tools/          hl.py + specs.json (finner tekstpassasjer), build_artifact.py (nettversjon)
```

```bash
cd film
npm install && npx playwright install chromium   # krever også ffmpeg
node render.cjs                                  # skriver output/SHMIL_grunnlaget_for_soknaden.mp4
node render.cjs --stills 99,173                  # enkeltbilder til output/stills/
```

Nye uthevinger legges inn i `tools/specs.json` og genereres slik (krever poppler-utils):

```bash
mkdir -p /tmp/shmil/bbox
for d in brev svar sok v1 v2; do pdftotext -bbox-layout source/$d.pdf /tmp/shmil/bbox/$d.html; done
python3 tools/hl.py /tmp/shmil tools/specs.json tools/highlights.json data.js
```
