# SHMIL – Fra tilsynsavvik til søknad

Animert dokumentarfilm (2:30, 16:9, Full HD) om SHMILs oppfølging av tilsynsavviket fra
Statsforvalteren i Nordland, avklaringen med Miljødirektoratet, dokumentasjonsarbeidet
sommeren 2026 og søknaden om tidsbegrenset unntak etter avfallsforskriften § 19-4.
Laget for visning i PowerPoint for representanter fra SHMILs 11 eierkommuner.

**Ferdig film:** [`output/SHMIL_fra_tilsynsavvik_til_soknad.mp4`](../output/SHMIL_fra_tilsynsavvik_til_soknad.mp4)
(H.264/AAC, 1920×1080, 30 fps, lydspor «Tactical Stillness»)

## Disposisjon (versjon 2)

Lyst, rolig uttrykk – én ting om gangen, store bokstaver og lange hold, så teksten kan leses
fra bakerste rad. Scenene klippes på musikkens frasetakter.

| Tid | Del | Innhold |
|-----|-----|---------|
| 0:00 | Åpning | Tittel over de fem originaldokumentene; tidslinjen med stasjonene tegnes |
| 0:09 | Tilsynet | 6.11.2025 · avviket som sitat · papp/papir og glass/metall mangler henteordning |
| 0:22 | Henvendelsen | 15.01.2026 · «metoden … eller miljøgevinsten» · 7 sider, 3 tema, 6 spørsmål |
| 0:40 | Svaret | 07.05.2026 · plikten gjelder uavhengig av målkravet · **§ 19-4** som vendepunkt · «Grunnlaget manglet.» |
| 1:06 | Dokumentasjonsarbeidet | Ni kilder hentes fram fra fagsystemer, arkiver og prosjektmapper (KOSTRA, Retura, Komtek, plukkanalysen, Sirkel, SSB, sorteringstest, konsekvensutredningen, kostnadsmodellen) · kontroll med kilde og datastatus · Vedlegg 1 og 2 |
| 1:32 | Søknaden | 31.08.2026 · fiberdunk for papp/papir, unntakssøknad for glass/metall · hver påstand viser til dokumentasjonen |
| 1:47 | Nytte og belastning | Ni av ti kilo samles allerede inn · det den siste tidelen ville kreve (56 000 stopp, 0,8 kg per stopp, 9 228 beholdere, tungtrafikk i boliggatene) |
| 1:59 | Konklusjonen | Boksen på side 1: 74 286 kr per ekstra tonn – over 40 ganger direktoratets anslag · 3,39 mill. kr i året, 3–4 % høyere gebyr |
| 2:12 | Oversendt | Søknad + Vedlegg 1 + Vedlegg 2 sendes Miljødirektoratet |
| 2:20 | Avslutning | «SHMIL søker om tidsbegrenset unntak etter § 19-4» · hele tidslinjen · «Vi venter fortsatt på svar.» |

Alle tall og sitater er hentet ordrett fra de fem PDF-ene i `source/`. Tilsynsrapporten var ikke
vedlagt og vises derfor ikke; avviket gjengis som sitat med kildehenvisning. Kildene i
dokumentasjonsdelen er navnene fra kilderegisteret i Vedlegg 1; arkivveggen er en grafisk
illustrasjon, ikke skjermbilder. CO₂ og trafikksikkerhet er ikke tallfestet i dokumentene, så
belastningen beskrives med søknadens egne formuleringer.

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
node render.cjs                                  # skriver output/SHMIL_fra_tilsynsavvik_til_soknad.mp4
node render.cjs --stills 59.5,126.8              # enkeltbilder til output/stills/
```

Nye uthevinger legges inn i `tools/specs.json` og genereres slik (krever poppler-utils):

```bash
mkdir -p /tmp/shmil/bbox
for d in brev svar sok v1 v2; do pdftotext -bbox-layout source/$d.pdf /tmp/shmil/bbox/$d.html; done
python3 tools/hl.py /tmp/shmil tools/specs.json tools/highlights.json data.js
```
