// Lager notatet (vedlegg F2) som Word-fil.
//   node notat.cjs [bilde.jpg] [utfil.docx]
// Bildet (montering av B2, 2018) ligger i bilder/ og holdes utenfor git.
const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Footer,
  AlignmentType, WidthType, BorderStyle, LevelFormat, PageNumber, TabStopType,
} = require('docx');

const photo = process.argv[2] ?? path.join(__dirname, 'bilder', 'montering_B2_2018.jpg');
const out = process.argv[3] ?? path.join(__dirname, 'Lindsetvegen_19_-_F2_notat_stalbjelker.docx');

const FONT = 'Arial';
const INK = '1B2027';
const MUTED = '6B737D';
const STEEL = '20405F';
const HAIR = 'C9CED4';

const run = (text, o = {}) => new TextRun({ text, font: FONT, color: INK, ...o });
const p = (children, o = {}) => new Paragraph({
  children: typeof children === 'string' ? [run(children)] : children,
  spacing: { after: 120, line: 288 }, ...o,
});
const lead = (title, body) => p([run(title + ' ', { bold: true, color: STEEL }), run(body)]);
const bullet = (children) => new Paragraph({
  children: typeof children === 'string' ? [run(children)] : children,
  numbering: { reference: 'dots', level: 0 }, spacing: { after: 80, line: 288 },
});
const h = (text) => new Paragraph({ text, heading: 'Heading1' });

const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const signCell = (name, width) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  borders: { top: { style: BorderStyle.SINGLE, size: 6, color: INK }, bottom: none, left: none, right: none },
  margins: { top: 60, right: 240 },
  children: [
    new Paragraph({ children: [run(name, { bold: true, size: 19 })], spacing: { after: 0 } }),
    new Paragraph({ children: [run('Dato og signatur', { color: MUTED, size: 17 })], spacing: { after: 0 } }),
  ],
});
const gap = (width) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none },
  children: [new Paragraph('')],
});

const TEXT_W = 9638; // A4 med 2 cm marger, i DXA
const signW = 2932;
const gapW = (TEXT_W - 3 * signW) / 2;

const img = fs.readFileSync(photo);

const doc = new Document({
  creator: 'Aleksander Puntervold',
  title: 'Stålbjelker i 1. etasje – beskrivelse av arbeidet (vedlegg F2)',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal',
        run: { font: FONT, size: 36, bold: true, color: INK },
        paragraph: { spacing: { before: 0, after: 60 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 24, bold: true, color: STEEL },
        paragraph: { spacing: { before: 300, after: 100 }, keepNext: true, outlineLevel: 0 } },
    ],
  },
  numbering: {
    config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }],
  },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: HAIR, space: 6 } },
        children: [
          run('Lindsetvegen 19 · gnr. 199 bnr. 9 · sak 2023/6670 · vedlegg F2', { size: 16, color: MUTED }),
          run('\tSide ', { size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
          run(' av ', { size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED }),
        ],
      })] }),
    },
    children: [
      p([run('VEDLEGG F2 · SAK 2023/6670', { size: 16, bold: true, color: MUTED, characterSpacing: 20 })],
        { spacing: { after: 40 } }),
      new Paragraph({ text: 'Stålbjelker i 1. etasje', heading: 'Title' }),
      p([run('Beskrivelse av arbeidet · Lindsetvegen 19, 8664 Mosjøen · gnr. 199 bnr. 9', { color: MUTED })], {
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 8 } },
        spacing: { after: 240 },
      }),

      h('Hva vi gjorde'),
      p('I 2018 fjernet vi to vegger i 1. etasje for å få en åpnere planløsning (F1 punkt 1.5 og 1.6). '
        + 'Begge ble erstattet med stålbjelker av typen IPE 180. Plasseringen er vist på tegning E3, '
        + 'og oppbyggingen i snitt på E4 og E5.'),
      bullet([run('Ved kjøkkenet – B1 (F1 punkt 1.6): ', { bold: true }),
        run('Veggen var mer en lettvegg, men den bar bjelkelaget over kjøkkenet, som var et lappeteppe av eldre bjelker.')]),
      bullet([run('I den tidligere yttergangen – B2 (F1 punkt 1.5): ', { bold: true }),
        run('En lettvegg rundt boden under trappa, som endte i en hjørnestolpe under gavlveggen i 2. etasje.')]),

      h('Slik står bjelkene'),
      lead('B1 ved kjøkkenet.', 'Bjelken har 98 mm opplegg i hver ende. Mot grunnmuren står den på to stendere '
        + '48 × 148 på en tømmerstokk rett over grunnmuren, og enden er felt ca. 5 cm inn i tømmerveggen. Ved den '
        + 'gamle teglsteinspipa står den på to stendere 48 × 98. Stenderne er festet til pipa, men lasten går ikke i '
        + 'pipa: den går via en gulvbjelke 48 × 196 ned på en stålbjelke (IPN 200) i krypkjelleren, og videre til en '
        + 'betongkloss. Vi åpnet gulvet og sørget for at stenderne står rett over den delen av IPN-bjelken som hviler '
        + 'på betongklossen. Pipa er tatt ut av bruk. Bjelkelaget over kjøkkenet forsterket vi med fire nye bjelker '
        + '48 × 148 fra ytterveggen til ca. 0,5 m forbi stålbjelken.'),
      lead('B2 i gangen.', 'Mot grunnmuren står bjelken på samme måte som B1. I den andre enden står den på to '
        + 'stendere 48 × 98, sidestøttet av en 48 × 148 som går videre opp i konstruksjonen, på en gulvbjelke '
        + '48 × 196 med kubbinger mot nabobjelkene. Under gulvbjelken står i tillegg en betongsøyle som ekstra støtte '
        + 'og sikkerhet. B2 bærer gulvet fra badsiden via trappevekslingen langs trappeåpningen, gavlveggen i '
        + '2. etasje der hjørnestolpen sto, og to av takbjelkene under takterrassen. Taket over trappa bæres av en '
        + 'tidligere yttervegg i 2. etasje ved badveggen og av ytterveggen, ikke av B2.'),
      lead('Sidestøtte.', 'Bjelkelaget over B1, og trappevekslingen og takbjelkene over B2, ligger oppå bjelkene '
        + 'og holder dem på plass sideveis.'),

      h('Valg av bjelker'),
      p('Vi la vekt på at lasten fra veggene som ble fjernet, skulle føres trygt ned til grunnmur eller fundament, '
        + 'og ikke bli stående som en punktlast midt på et gulvspenn. Dimensjonene ble vurdert sammen med Rolf og '
        + 'Jan. Jan, som er ingeniør, sto for dimensjoneringen og landet på IPE 180 med god margin. Stålet ble '
        + 'bestilt, kappet og levert gjennom Storvik AS, der Jan da var leder.'),
      p('Valget av IPE 180 er dokumentert i beregningen i vedlegg F3, som Jan går god for. Beregningen er gjort på '
        + 'den sikre siden. Den viser at bjelkene er utnyttet om lag to tredjedeler i bøyning (B1: 64 %, B2: 65 %), '
        + 'og at nedbøyningen holder seg godt innenfor kravet. For B2 er snøfonn på takterrassen tatt med.'),

      h('Hvem som hjalp'),
      lead('Rolf Puntervold, min far.', 'Svennebrev i tømrerfaget (1983). Har arbeidet som tømrer og snekker, '
        + 'blant annet i Vefsn kommune og i om lag to år som selvstendig tømrer med boligoppføring. Bachelor i '
        + 'yrkesfaglærerutdanning, bygg- og anleggsteknikk (NTNU, 2017) og praktisk-pedagogisk utdanning. '
        + 'Byggfaglærer ved Mosjøen videregående skole. Rolf var med på planleggingen og det praktiske arbeidet, '
        + 'særlig opplegg, stendere og forsterkningen av bjelkelaget.'),
      lead('Jan Sandbukt, min svigerfar.', 'Ingeniør, med erfaring fra prosjektering og dimensjonering av '
        + 'stålkonstruksjoner og takkonstruksjoner. Tidligere leder i Storvik AS og lærer ved MRK-senteret. Jan sto '
        + 'for dimensjoneringen og valget av stålbjelker, var med på å vurdere plassering og opplegg, og skaffet '
        + 'stålet gjennom Storvik.'),
      p('Jeg deltok selv i hele arbeidet sammen med dem.'),

      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
        children: [new ImageRun({ type: 'jpg', data: img, transformation: { width: 255, height: 340 },
          altText: { title: 'Montering av B2, 2018', description: 'Montering av stålbjelken i gangen i 2018',
            name: 'montering-b2' } })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [run('Montering av stålbjelken i gangen (B2), 2018. Fra venstre: Aleksander Puntervold, '
          + 'Jan Sandbukt og Rolf Puntervold.', { size: 17, italics: true, color: MUTED })],
      }),

      h('Bekreftelse'),
      p('Vi bekrefter at beskrivelsen av vår medvirkning stemmer.', { spacing: { after: 720 } }),
      new Table({
        width: { size: TEXT_W, type: WidthType.DXA },
        columnWidths: [signW, gapW, signW, gapW, signW],
        borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
        rows: [new TableRow({ children: [
          signCell('Rolf Puntervold', signW), gap(gapW),
          signCell('Jan Sandbukt', signW), gap(gapW),
          signCell('Aleksander Puntervold, tiltakshaver', signW),
        ] })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log(out);
});
