# Stålbjelker – tegninger og beregningsnotat fra kode

Verktøy som lager prinsipptegninger (A3, vektor-PDF) og et beregningsnotat (Word og PDF) for to stålbjelker
IPE 180 som erstatter bærende vegger i en enebolig. Alle tall i tegninger og notat kommer fra én beregningsmotor,
slik at dokumentene ikke kan komme i utakt.

Mappen inneholder ingen personopplysninger. Eiendom, tiltakshaver og saksnummer leses fra `privat/prosjekt.json`,
som ikke er versjonskontrollert. Uten den filen bygges alt med plassholdere som `[eiendom]`.

## Bygge

```bash
cd src
./build.sh            # skriver PDF og DOCX til ../leveranse
```

Krever Python 3 med Pillow og pypdf, Node med pakkene `docx` og `playwright` (Chromium), LibreOffice og skriften
Inter.

## Filer

| Fil | Rolle |
| --- | --- |
| `src/calc.py` | Beregningsmotor. Forutsetningene står samlet øverst. Skriver `results.json` |
| `src/model.py` | Geometri for planen og prosjektopplysninger (fra `privat/prosjekt.json`) |
| `src/drawlib.py`, `src/calcfig.py` | Tegnebibliotek: SVG i millimeter, ramme og tittelfelt, målsetting, skravur, lastfigurer |
| `src/sheet1.py`, `sheet2.py`, `sheet3.py` | Ark S-01 (plan 1:50), S-02 og S-03 (snitt 1:20, detaljer 1:10) |
| `src/figs.py` | Figurene i notatet |
| `src/doclib.js`, `src/notat.js` | Beregningsnotatet |
| `src/render.js` | SVG til PDF og PNG via Chromium |
| `src/build.sh` | Bygger hele pakken |

## `privat/prosjekt.json`

```json
{
  "filprefiks": "Gateadresse 1",
  "eiendom": "Gateadresse 1, 0000 Sted",
  "gnr_bnr": "gnr. 0 bnr. 0",
  "kommune": "Kommune",
  "tiltakshaver": "Navn",
  "sak": "0000/0000",
  "befaring": "befaring dd.mm.åååå med fagutdannet tømrer",
  "dato": "dd.mm.åååå",
  "rev": "11"
}
```

Brev, redegjørelser og andre dokumenter med personopplysninger hører også hjemme i `privat/`. `build.sh` bygger
dem dersom de finnes.

## Forbehold

Beregningene er overslag til gjennomgang og ikke prosjektering med ansvarsrett. Tallverdier fra de nasjonale
tilleggene til Eurokodene er hentet fra åpne kilder og må kontrolleres mot gjeldende utgave av standardene.
