# SHMIL – Grunnlaget for søknaden

Animert dokumentarfilm (3:24, 16:9, Full HD) om arbeidet bak SHMILs søknad om tidsbegrenset
unntak etter avfallsforskriften § 19-4: hvordan dokumentasjonen ble hentet inn fra arkiver og
fagsystemer, analysert og sammenstilt i Vedlegg 1 og 2, og hvordan søknaden bygger på den.
Laget for visning i PowerPoint for representanter fra SHMILs 11 eierkommuner.

**Ferdig film:** [`output/SHMIL_grunnlaget_for_soknaden.mp4`](../output/SHMIL_grunnlaget_for_soknaden.mp4)
(H.264/AAC, 1920×1080, 30 fps, lydspor «Cosmos 18 (Remix)»)

## Disposisjon (versjon 3)

Lyst, rolig uttrykk med lange hold og store bokstaver. Scenene klippes på musikkens fraser
(128 bpm, 15-sekunders fraser).

| Tid | Del | Innhold |
|-----|-----|---------|
| 0:00 | Tittel | «Grunnlaget for søknaden» over søknaden og vedleggene |
| 0:12 | Tilsynet | 6.11.2025 – tilsynsavvik, krav om henteordning |
| 0:20 | Januar – SHMILs spørsmål | Brevet 15.01.2026 (7 sider, 6 spørsmål markert i originalen) · spørsmål 1a, 1c og 3a ordrett |
| 0:50 | Mai – svaret ordrett | Svarbrevet 07.05.2026 · SHMILs spørsmål og direktoratets svar ordrett for 1c, 2a og 3a · § 19-4 («slår urimelig ut …», «det skal mye til») · «ikke tilstrekkelig informasjon» · «Grunnlaget manglet.» |
| 1:35 | Dokumentasjonen | Søknad, Vedlegg 1 og Vedlegg 2 (31 sider) på flaten · kameraet blar gjennom originalsidene og stopper ved vurderingene: datastatus og kilder (V1), kvalitetsindikatorer (V1), sensitivitet (2.3), alternativer (3.4), usikker mengdeeffekt (4.2), forholdsmessighet (5.2) |
| 2:05 | Beregningsmodellen | 8 959 avtaler → ca. 8 650 stoppesteder → ca. 56 000 tømmestopp → 225 kjøretøydager → 2,99 + 0,40 mill. kr = 3,39 mill. kr i året |
| 2:20 | Søknaden | Søknaden legges på grunnlaget · «Denne søknaden gir det manglende grunnlaget» – koblet til kildene |
| 2:35 | Nytte og belastning | Ni av ti kilo samles allerede inn · den siste tidelen krever ca. 56 000 tømmestopp i året |
| 2:42 | Konklusjonen | Boksen på side 1: 74 286 kr per ekstra tonn – over 40 ganger direktoratets anslag · 3,39 mill. kr i året, 3–4 % høyere gebyr |
| 3:05 | Oversendt | Søknad + Vedlegg 1 + Vedlegg 2 sendes 31.08.2026 |
| 3:11 | Avslutning | «SHMIL søker om tidsbegrenset unntak etter § 19-4» · tidslinjen · «Vi venter fortsatt på svar.» |

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
