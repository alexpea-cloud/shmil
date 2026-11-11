// doclib.js – små hjelpere rundt docx-js for notat, redegjørelse og brev (A4, Arial).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber,
  VerticalAlign, TabStopType, PageBreak, TableLayoutType,
} = require('docx');

// Eiendom, tiltakshaver og saksnummer ligger i privat/prosjekt.json, som ikke versjonskontrolleres.
const PRIV = path.join(__dirname, '..', 'privat', 'prosjekt.json');
const PROJ = fs.existsSync(PRIV) ? JSON.parse(fs.readFileSync(PRIV, 'utf8')) : {};
const proj = (k, fallback) => PROJ[k] || fallback || `[${k}]`;

const MM = 56.6929;                      // DXA per mm
const FONT = 'Arial';
const INK = '1B2026', INK2 = '48525C', INK3 = '7A8590', RULE = 'C4CAD0', STEEL = '1F4468';
const GREEN = '2E7D4F', AMBER = 'B26A00', RED = 'C62828', HEADFILL = 'EEF1F4';

const fmt = (v, nd = 2) => Number(v).toFixed(nd).replace('.', ',').replace('-', '−');
const pct = (v) => `${fmt(v * 100, 0)} %`;
const rng = (a, b) => `${fmt(Math.min(a, b) * 100, 0)}–${fmt(Math.max(a, b) * 100, 0)} %`;

// ---- inline-markering: **fet**, *kursiv*, _{senket}, ^{hevet} -------------------------------
function runs(text, o = {}) {
  const out = [];
  const base = { font: FONT, size: o.size || 20, color: o.color || INK, bold: o.bold, italics: o.italics };
  let i = 0, buf = '', bold = false, ital = false, hl = false;
  const flush = (extra = {}) => {
    if (buf) out.push(new TextRun({ ...base, bold: base.bold || bold, italics: base.italics || ital,
                                    ...(hl ? { highlight: 'yellow' } : {}), ...extra, text: buf }));
    buf = '';
  };
  // hardt mellomrom mellom tall og enhet, slik at de ikke skilles ved linjeskift
  const s = String(text).replace(/(\d) (?=(?:kNm|kN\/m²|kN\/m³|kN\/m|kN|N\/mm²|mm²|mm|cm²|cm³|cm⁴|cm|m²|m³|m|%|kg\/m)(?![\wæøåÆØÅ]))/g, '$1\u00a0');
  while (i < s.length) {
    if (s.startsWith('[[', i)) { flush(); hl = true; buf = '['; i += 2; continue; }
    if (s.startsWith(']]', i)) { buf += ']'; flush(); hl = false; i += 2; continue; }
    if (s.startsWith('**', i)) { flush(); bold = !bold; i += 2; continue; }
    if (s[i] === '*' && s[i + 1] !== ' ' && (ital || s.indexOf('*', i + 1) > 0)) { flush(); ital = !ital; i += 1; continue; }
    if (s.startsWith('_{', i) || s.startsWith('^{', i)) {
      flush();
      const j = s.indexOf('}', i);
      buf = s.slice(i + 2, j);
      flush(s[i] === '_' ? { subScript: true } : { superScript: true });
      i = j + 1; continue;
    }
    buf += s[i]; i += 1;
  }
  flush();
  return out;
}

const P = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.LEFT,
  spacing: { before: o.before ?? 0, after: o.after ?? 110, line: o.line ?? ((o.size || 20) > 24 ? undefined : 276) },
  indent: o.indent, keepNext: o.keepNext, keepLines: o.keepLines,
  border: o.border, shading: o.shading, tabStops: o.tabStops,
  children: Array.isArray(text) ? text : runs(text, o),
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 300, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 3 } },
  children: [new TextRun({ text, font: FONT, size: 28, bold: true, color: INK })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 220, after: 90 },
  children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: STEEL })],
});
const H3 = (text) => new Paragraph({
  keepNext: true, spacing: { before: 160, after: 70 },
  children: [new TextRun({ text, font: FONT, size: 20, bold: true, color: INK })],
});

const bullets = (items, o = {}) => items.map((t) => new Paragraph({
  numbering: { reference: o.ref || 'bul', level: o.level || 0 },
  spacing: { before: 0, after: o.after ?? 60, line: 276 },
  children: runs(t, o),
}));
const numbered = (items, o = {}) => items.map((t) => new Paragraph({
  numbering: { reference: o.ref || 'num', level: 0 },
  spacing: { before: 0, after: o.after ?? 70, line: 276 },
  children: runs(t, o),
}));

// ---- tabeller --------------------------------------------------------------------------------
const thin = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function cell(content, w, o = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) => (c instanceof Paragraph ? c : new Paragraph({
    alignment: o.align || AlignmentType.LEFT, spacing: { before: 0, after: 0, line: 252 }, keepNext: o.keepNext,
    children: runs(c, { size: o.size || 18, bold: o.bold, color: o.color }),
  })));
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: o.valign || VerticalAlign.CENTER,
    margins: { top: o.padV ?? 50, bottom: o.padV ?? 50, left: 90, right: 90 },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    borders: o.borders || { top: thin, bottom: thin, left: none, right: none },
    columnSpan: o.span, children: paras,
  });
}

/** rows: array av arrays (strenger eller {t, bold, color, fill, align, span}). widths i DXA. */
function tbl(rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const aligns = o.align || widths.map((_, i) => (i === 0 ? 'l' : 'r'));
  const A = { l: AlignmentType.LEFT, r: AlignmentType.RIGHT, c: AlignmentType.CENTER };
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: rows.map((r, ri) => new TableRow({
      cantSplit: true, tableHeader: o.header !== false && ri === 0,
      children: (() => {
        const cells = []; let ci = 0;
        for (const c of r) {
          const obj = (typeof c === 'object' && c !== null && !Array.isArray(c) && !(c instanceof Paragraph)) ? c : { t: c };
          const span = obj.span || 1;
          const w = widths.slice(ci, ci + span).reduce((a, b) => a + b, 0);
          const isHead = o.header !== false && ri === 0;
          cells.push(cell(obj.t, w, {
            align: A[obj.align || aligns[ci]], size: o.size || 18,
            bold: obj.bold ?? (isHead || (o.boldFirstCol && ci === 0) || (o.boldLast && ri === rows.length - 1)),
            color: obj.color || (isHead ? INK2 : undefined),
            fill: obj.fill || (isHead ? HEADFILL : undefined), span: span > 1 ? span : undefined,
            valign: o.valign, padV: o.padV, keepNext: o.keep && ri < rows.length - 1,
          }));
          ci += span;
        }
        return cells;
      })(),
    })),
  });
}

/** Regnelinjer: [[størrelse, uttrykk], ...] som rammeløs tabell. */
function calc(lines, widths = [2700, 6710], keep = true) {
  const nb = { top: none, bottom: none, left: none, right: none };
  return new Table({
    width: { size: widths[0] + widths[1], type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: lines.map(([a, b], ri) => new TableRow({
      cantSplit: true,
      children: [cell(a, widths[0], { borders: nb, color: INK2, size: 19, valign: VerticalAlign.TOP, padV: 28,
                                   keepNext: keep && ri < lines.length - 1 }),
                 cell(b, widths[1], { borders: nb, size: 19, valign: VerticalAlign.TOP, padV: 28,
                                   keepNext: keep && ri < lines.length - 1 })],
    })),
  });
}

/** Nøkkel–verdi-tabell (dokumentinfo). */
function kv(pairs, widths = [2300, 7110]) {
  return new Table({
    width: { size: widths[0] + widths[1], type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: pairs.map(([k, v]) => new TableRow({
      children: [cell(k, widths[0], { color: INK2, size: 18, valign: VerticalAlign.TOP, fill: 'F6F7F9' }),
                 cell(v, widths[1], { size: 19, valign: VerticalAlign.TOP })],
    })),
  });
}

function figure(file, widthMm, caption) {
  const buf = fs.readFileSync(file);
  // PNG-dimensjoner fra IHDR
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const wpx = Math.round(widthMm / 25.4 * 96), hpx = Math.round(wpx * h / w);
  const out = [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true,
    children: [new ImageRun({ type: 'png', data: buf, transformation: { width: wpx, height: hpx },
                              altText: { title: caption, description: caption, name: path.basename(file) } })],
  })];
  if (caption) out.push(P(caption, { size: 17, color: INK2, align: AlignmentType.CENTER, after: 160, italics: true }));
  return out;
}

const spacer = (after = 120) => new Paragraph({ spacing: { before: 0, after }, children: [] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

/** Fremhevet boks (én celle med venstrekant). */
function callout(paras, color = AMBER, fill = 'FBF6EC', width = 9410) {
  return new Table({
    width: { size: width, type: WidthType.DXA }, columnWidths: [width], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: width, type: WidthType.DXA },
      margins: { top: 110, bottom: 110, left: 170, right: 150 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill },
      borders: { top: none, bottom: none, right: none, left: { style: BorderStyle.SINGLE, size: 24, color } },
      children: paras,
    })] })],
  });
}

function makeDoc({ title, headerText, children, margins }) {
  const m = margins || { top: 20, bottom: 18, left: 22, right: 22 };
  return new Document({
    creator: 'Tiltakshaver', title, description: title,
    styles: {
      paragraphStyles: [
        { id: 'FootSmall', name: 'Foot Small', basedOn: 'Normal', run: { font: FONT, size: 15, color: INK3 } },
      ],
      default: {
        document: { run: { font: FONT, size: 20, color: INK } },
        heading1: { run: { font: FONT, size: 28, bold: true, color: INK }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true } },
        heading2: { run: { font: FONT, size: 22, bold: true, color: STEEL }, paragraph: { spacing: { before: 220, after: 90 }, keepNext: true } },
      },
    },
    numbering: {
      config: [
        { reference: 'bul', levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 400, hanging: 220 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 760, hanging: 220 } } } }] },
        { reference: 'num', levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 440, hanging: 320 } } } }] },
        { reference: 'num2', levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 440, hanging: 320 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 },
                            margin: { top: Math.round(m.top * MM), bottom: Math.round(m.bottom * MM),
                                      left: Math.round(m.left * MM), right: Math.round(m.right * MM),
                                      header: Math.round(9 * MM), footer: Math.round(8 * MM) } } },
      headers: headerText ? { default: new Header({ children: [new Paragraph({
        spacing: { after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
        tabStops: [{ type: TabStopType.RIGHT, position: Math.round((210 - m.left - m.right) * MM) }],
        children: [new TextRun({ text: headerText[0], font: FONT, size: 15, color: INK3 }),
                   new TextRun({ text: '\t' + headerText[1], font: FONT, size: 15, color: INK3 })],
      })] }) } : undefined,
      footers: { default: new Footer({ children: [new Paragraph({
        style: 'FootSmall', alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0 },
        children: [new TextRun({ children: ['Side ', PageNumber.CURRENT, ' av ', PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: INK3 })],
      })] }) },
      children,
    }],
  });
}

async function save(doc, file) {
  let buf = await Packer.toBuffer(doc);
  // docx-biblioteket skriver <w:highlightCs/> for markert tekst. Elementet finnes ikke i skjemaet og fjernes,
  // slik at filen validerer. JSZip følger med docx-pakken.
  const JSZip = require(require.resolve('jszip', { paths: [path.dirname(require.resolve('docx'))] }));
  const zip = await JSZip.loadAsync(buf);
  const part = 'word/document.xml';
  const xml = await zip.file(part).async('string');
  if (xml.includes('<w:highlightCs')) {
    zip.file(part, xml.replace(/<w:highlightCs[^>]*\/>/g, ''));
    buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
  fs.writeFileSync(file, buf);
  console.log('skrev', file);
}

module.exports = { proj, fmt, pct, rng, runs, P, H1, H2, H3, bullets, numbered, tbl, calc, kv, figure, spacer, pageBreak, callout,
  makeDoc, save, MM, INK, INK2, INK3, RULE, STEEL, GREEN, AMBER, RED, HEADFILL, AlignmentType, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, ShadingType, TableLayoutType, cell };
