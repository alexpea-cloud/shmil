#!/usr/bin/env python3
"""Lindsetvegen 19 – stålbjelker IPE 180 i 1. etasje.

Genererer de tre tegningsarkene (plan 1:50, snitt langs B1 og B2 1:25) som
HTML/SVG. render.mjs skriver HTML-en ut til PDF i A4 liggende.

Geometrien er hentet ut av rev. 9 og ligger her i samme koordinater (pt på
A4, dvs. allerede i riktig målestokk: 1 m = 56,69 pt i plan og 113,39 pt i
snitt). Bare layout og grafikk er nytt – mål, tekster og beregninger er de
samme som i rev. 9.

Bruk:  python3 generate.py            -> build/tegninger.html
       node render.mjs                -> PDF
"""
from __future__ import annotations

import html
import os

# ---------------------------------------------------------------------------
# Prosjektdata
# ---------------------------------------------------------------------------
PROJECT = "Lindsetvegen 19"
SUBJECT = "Stålbjelker IPE 180 i 1. etasje"
STATUS = "Prinsippskisse – ikke arbeidstegning"
REV = "10"
REV_DATE = "08.11.2026"
REV_NOTE = "ny layout, innhold som rev. 9"

# ---------------------------------------------------------------------------
# Grafisk profil
# ---------------------------------------------------------------------------
INK = "#1b2027"        # tekst, hovedlinjer
INK2 = "#4a525d"       # sekundær tekst, mållinjer
MUTED = "#8c939d"      # romnavn, hjelpetekst
HAIR = "#d5d9de"       # skillelinjer
WALL = "#e2e5e9"       # eksisterende vegger (plan)
STAIR = "#b4bac2"
STEEL = "#20405f"      # nye stålbjelker
STEEL_FILL = "#dfe7ef"
SUPPORT = "#0e1114"    # opplegg (svart)
UNDER = "#8a919a"      # under gulvet (stiplet grått)
UPPER = "#39424d"      # 2. etasje (strekpunktert) / bjelkelag (stiplet)
SNOW = "#2f74bd"       # takterrasse / snø
RED = "#d0352b"        # fjernet hjørnestolpe
AMBER = "#b06d00"      # til kontroll
WOOD = "#9b8667"
WOOD_FILL = "#fbf8f2"
LOG_FILL = "#f2ede4"
CONC = "#efedea"
BRICK = "#c4765c"
BAND = "#e3ebf5"       # lastbredde (tonet felt)

PT_PER_MM = 72 / 25.4
PAGE_W = 297 * PT_PER_MM
PAGE_H = 210 * PT_PER_MM


def mm(v: float) -> float:
    return v * PT_PER_MM


def n(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def attrs(a: dict) -> str:
    out = []
    for k, v in a.items():
        if v is None:
            continue
        out.append(f'{k.rstrip("_").replace("_", "-")}="{v}"')
    return " ".join(out)


def rect(x0, y0, x1, y1, **a):
    return (f'<rect x="{n(min(x0, x1))}" y="{n(min(y0, y1))}" width="{n(abs(x1 - x0))}" '
            f'height="{n(abs(y1 - y0))}" {attrs(a)}/>')


def line(x0, y0, x1, y1, **a):
    return f'<line x1="{n(x0)}" y1="{n(y0)}" x2="{n(x1)}" y2="{n(y1)}" {attrs(a)}/>'


def poly(pts, closed=True, **a):
    d = "M" + " L".join(f"{n(x)},{n(y)}" for x, y in pts) + (" Z" if closed else "")
    return f'<path d="{d}" {attrs(a)}/>'


def circle(cx, cy, r, **a):
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" {attrs(a)}/>'


def text(x, y, s, size=6.5, weight=400, fill=INK, anchor="start", rot=None,
         italic=False, halo=False, halo_color="#fff", ls=None, raw=False):
    """SVG-tekst. halo = luft (pt) rundt teksten som maskeres ut med en flate i
    halo_color – flaten legges inn av skriptet i HTML-en når fontene er lastet."""
    a = {
        "x": n(x), "y": n(y), "font-size": n(size), "font-weight": weight,
        "fill": fill, "text-anchor": anchor,
    }
    if italic:
        a["font-style"] = "italic"
    if ls:
        a["letter-spacing"] = ls
    if rot is not None:
        a["transform"] = f"rotate({n(rot)} {n(x)} {n(y)})"
    if halo:
        a["data-halo"] = n(1.2 if halo is True else halo / 2)
        a["data-halo-color"] = halo_color
    body = s if raw else esc(s)
    return f"<text {attrs(a)}>{body}</text>"


def sub(s, size):
    """SVG-tspan for senket skrift (f.eks. q_Ed)."""
    return (f'<tspan dy="{n(size * 0.28)}" font-size="{n(size * 0.72)}">{esc(s)}</tspan>'
            f'<tspan dy="{n(-size * 0.28)}"></tspan>')


# ---------------------------------------------------------------------------
# Målsetting
# ---------------------------------------------------------------------------
def tick(x, y, s=2.1, color=INK2, w=0.55):
    return line(x - s, y + s, x + s, y - s, stroke=color, stroke_width=w)


def dim_h(y, xs, labels, color=INK2, size=6.2, over=2.6, weight=400, ext=2.5,
          lw=0.4, label_fill=None):
    """Horisontal målkjede. xs = stigende punkter, labels = tekst per felt."""
    out = [line(xs[0] - ext, y, xs[-1] + ext, y, stroke=color, stroke_width=lw)]
    for x in xs:
        out.append(tick(x, y, color=color))
    for i, lab in enumerate(labels):
        if lab:
            out.append(text((xs[i] + xs[i + 1]) / 2, y - over, lab, size=size,
                            fill=label_fill or color, anchor="middle", weight=weight))
    return "".join(out)


def dim_v(x, ys, labels, color=INK2, size=6.2, side=-1, weight=400, ext=2.5,
          lw=0.4, label_fill=None, gap=2.6):
    """Vertikal målkjede (tekst leses nedenfra og opp, til venstre for linjen)."""
    ys = sorted(ys)
    out = [line(x, ys[0] - ext, x, ys[-1] + ext, stroke=color, stroke_width=lw)]
    for y in ys:
        out.append(tick(x, y, color=color))
    labs = labels
    for i, lab in enumerate(labs):
        if lab:
            ym = (ys[i] + ys[i + 1]) / 2
            tx = x - gap if side < 0 else x + gap + size * 0.75
            out.append(text(tx, ym, lab, size=size, fill=label_fill or color,
                            anchor="middle", rot=-90, weight=weight))
    return "".join(out)


def callout(cx, cy, num, tx=None, ty=None, color=INK, r=5.0):
    """Nummerert merke med valgfri peker til (tx, ty)."""
    out = []
    if tx is not None:
        dx, dy = tx - cx, ty - cy
        d = (dx * dx + dy * dy) ** 0.5 or 1
        sx, sy = cx + dx / d * r, cy + dy / d * r
        out.append(line(sx, sy, tx, ty, stroke=color, stroke_width=0.45))
        out.append(circle(tx, ty, 1.05, fill=color))
    out.append(circle(cx, cy, r, fill="#fff", stroke=color, stroke_width=0.7))
    out.append(text(cx, cy + 2.2, str(num), size=6.4, weight=600, fill=color, anchor="middle"))
    return "".join(out)


def scalebar(x, y, metres, unit_pt, step, label_every=None, h=2.2):
    """Målestokk: vekslende felt, tall under."""
    out = []
    k = 0
    v = 0.0
    while v < metres - 1e-9:
        x0 = x + v * unit_pt
        x1 = x + min(v + step, metres) * unit_pt
        out.append(rect(x0, y, x1, y + h, fill=INK if k % 2 == 0 else "#fff",
                        stroke=INK, stroke_width=0.35))
        v += step
        k += 1
    label_every = label_every or step
    v = 0.0
    while v <= metres + 1e-9:
        s = n(v).replace(".", ",")
        out.append(text(x + v * unit_pt, y + h + 6.2, s, size=5.6, fill=MUTED, anchor="middle"))
        v += label_every
    out.append(text(x + metres * unit_pt + 5, y + h + 6.2, "m", size=5.6, fill=MUTED))
    return "".join(out)


# ---------------------------------------------------------------------------
# Felles SVG-definisjoner (mønstre)
# ---------------------------------------------------------------------------
DEFS = f"""
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
 <defs>
  <pattern id="brick" patternUnits="userSpaceOnUse" width="4.2" height="4.2" patternTransform="rotate(45)">
   <line x1="0" y1="0" x2="0" y2="4.2" stroke="{BRICK}" stroke-width="0.45" stroke-opacity="0.55"/>
  </pattern>
  <pattern id="conc" patternUnits="userSpaceOnUse" width="15" height="13">
   <circle cx="2.2" cy="2.4" r="0.38" fill="#a9a39a"/>
   <circle cx="9.6" cy="5.2" r="0.32" fill="#a9a39a"/>
   <circle cx="5.1" cy="10.4" r="0.36" fill="#a9a39a"/>
   <circle cx="12.8" cy="11.1" r="0.3" fill="#a9a39a"/>
   <path d="M11.4,1.2 l1.1,1.9 h-2.2 z" fill="none" stroke="#b3ada4" stroke-width="0.3"/>
   <path d="M2.6,6.8 l1.0,1.7 h-2.0 z" fill="none" stroke="#b3ada4" stroke-width="0.3"/>
  </pattern>
  <pattern id="ground" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
   <line x1="0" y1="0" x2="0" y2="7" stroke="#9c927f" stroke-width="0.5"/>
  </pattern>
  <linearGradient id="groundfade" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#fff" stop-opacity="0"/>
   <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </linearGradient>
 </defs>
</svg>
"""

# ---------------------------------------------------------------------------
# Ark-oppsett
# ---------------------------------------------------------------------------
MARGIN = mm(10)
FIELD_X0 = MARGIN
FIELD_X1 = mm(199)
STRIP_X = 207           # mm
STRIP_W = 80            # mm
FOOT_TOP = 186          # mm


def title_row(title: str, scale: str, metres: float, unit_pt: float, step: float) -> str:
    """Tittel øverst til venstre i tegningsfeltet, med målestokk og skala."""
    return (text(FIELD_X0, MARGIN + 10.5, title, size=12.5, weight=600, fill=INK)
            + text(FIELD_X0, MARGIN + 22.0, scale, size=7.2, weight=500, fill=INK2)
            + scalebar(FIELD_X0 + 24, MARGIN + 17.6, metres, unit_pt, step))


def foot(drawing: str, scale: str, sheet: int) -> str:
    cells = [
        ("Prosjekt", f'<b class="big">{esc(PROJECT)}</b><br>{esc(SUBJECT)}', "1.55fr"),
        ("Tegning", esc(drawing), "1.35fr"),
        ("Målestokk", esc(scale), "0.62fr"),
        ("Status", esc(STATUS), "1.15fr"),
        ("Revisjon", f"{REV} · {REV_DATE}<br><span class='m'>{esc(REV_NOTE)}</span>", "1.05fr"),
    ]
    cols = " ".join(c[2] for c in cells) + " 17mm"
    inner = "".join(
        f'<div class="fc"><div class="fl">{lab}</div><div class="fv">{val}</div></div>'
        for lab, val, _ in cells)
    inner += (f'<div class="fc sheetno"><div class="fl">Ark</div>'
              f'<div class="fv"><span class="no">{sheet}</span><span class="of">/3</span></div></div>')
    return f'<div class="foot" style="grid-template-columns:{cols}">{inner}</div>'


def sheet(svg_body: str, html_body: str) -> str:
    return (f'<section class="sheet">'
            f'<svg class="draw" viewBox="0 0 {n(PAGE_W)} {n(PAGE_H)}" '
            f'xmlns="http://www.w3.org/2000/svg" font-family="InterTT, Inter, sans-serif">{svg_body}</svg>'
            f'{html_body}</section>')


# ===========================================================================
# ARK 1 – PLAN 1:50
# ===========================================================================
# Koordinater (pt) fra rev. 9. Planen roteres 90° mot klokka slik at B1 og B2
# ligger vannrett og leses i samme retning som snittene (pipa/grunnmuren til
# venstre).
PLAN_CROP = (45.0, 60.0, 487.0, 533.0)        # xo0, yo0, xo1, yo1
PLAN_OX = 60.0                                 # pt på arket
PLAN_OY = 78.0
PLAN_ROT = True


def P(xo, yo):
    """Originalkoordinat -> arkkoordinat (rotert plan)."""
    if PLAN_ROT:
        return (PLAN_OX + (yo - PLAN_CROP[1]), PLAN_OY + (PLAN_CROP[2] - 5.5 - xo))
    return (PLAN_OX + xo - PLAN_CROP[0], PLAN_OY + yo - PLAN_CROP[1])


def plan_group_transform():
    if PLAN_ROT:
        x, y = P(0, 0)
        return f"translate({n(x)},{n(y)}) rotate(-90)"
    x, y = P(0, 0)
    return f"translate({n(x)},{n(y)})"


WALLS = [
    [(280.8, 520.5), (247.6, 520.5), (247.0, 519.9), (247.0, 515.4), (240.6, 515.7), (240.6, 653.0),
     (240.0, 653.6), (62.8, 653.6), (62.2, 653.0), (62.2, 594.2), (51.0, 594.2), (51.0, 665.7),
     (312.1, 665.7), (312.1, 653.6), (247.6, 653.6), (247.0, 653.0), (247.0, 527.5), (247.6, 526.9),
     (280.5, 526.9)],
    [(51.0, 538.4), (62.2, 538.4), (62.2, 462.4), (62.8, 461.8), (240.0, 461.8), (240.6, 462.4),
     (240.6, 465.6), (247.0, 466.0), (247.0, 420.9), (240.6, 420.6), (240.6, 454.8), (240.0, 455.4),
     (62.8, 455.4), (62.2, 454.8), (62.2, 398.9), (51.0, 398.9)],
    [(51.0, 195.0), (51.0, 343.0), (62.2, 343.0), (62.2, 315.0), (62.8, 314.4), (240.0, 314.4),
     (240.6, 315.0), (240.6, 376.9), (247.0, 376.6), (247.0, 315.0), (247.6, 314.4), (274.7, 314.4),
     (274.7, 310.8), (275.7, 308.6), (276.0, 310.2), (329.3, 310.2), (329.7, 308.6), (330.6, 310.8),
     (330.6, 314.4), (469.4, 314.6), (469.4, 426.4), (402.4, 426.7), (402.7, 438.8), (419.0, 438.8),
     (419.6, 439.5), (419.6, 442.9), (421.9, 443.6), (421.9, 492.8), (419.6, 493.4), (419.6, 519.9),
     (419.0, 520.5), (353.9, 520.5), (347.9, 519.9), (347.9, 493.0), (336.1, 492.8), (335.8, 519.2),
     (335.8, 520.5), (324.6, 520.5), (324.9, 526.9), (424.7, 526.9), (425.4, 527.5), (425.4, 529.8),
     (469.8, 529.8), (470.4, 530.4), (470.4, 653.0), (469.8, 653.6), (367.9, 653.6), (367.9, 665.7),
     (481.3, 665.7), (481.5, 517.9), (432.4, 517.7), (431.8, 517.0), (431.8, 493.7), (428.3, 493.7),
     (426.0, 492.8), (427.6, 492.4), (427.6, 443.9), (426.0, 443.6), (428.3, 442.7), (431.8, 442.7),
     (431.8, 439.5), (432.4, 438.8), (481.5, 438.8), (481.5, 262.9), (470.4, 262.9), (470.4, 301.6),
     (469.8, 302.2), (359.7, 302.2), (359.0, 301.6), (359.0, 272.2), (352.6, 272.5), (352.6, 301.6),
     (352.0, 302.2), (330.3, 302.2), (329.7, 304.4), (275.7, 304.4), (275.1, 302.2), (62.8, 302.2),
     (62.2, 301.6), (62.2, 195.0)],
    [(481.5, 158.6), (470.4, 158.6), (470.4, 200.1), (469.8, 200.7), (359.7, 200.7), (359.0, 200.1),
     (359.0, 161.2), (352.6, 161.5), (352.6, 227.2), (359.0, 227.6), (359.0, 207.7), (359.7, 207.1),
     (469.8, 207.1), (470.4, 207.7), (470.4, 230.1), (481.5, 230.1)],
    [(51.0, 17.9), (51.0, 88.4), (53.6, 88.4), (55.8, 89.3), (54.2, 89.7), (54.2, 131.5), (55.8, 131.8),
     (53.6, 132.8), (51.0, 132.8), (51.0, 139.1), (62.2, 139.1), (62.2, 132.4), (60.9, 131.8),
     (60.9, 89.3), (62.2, 88.7), (62.2, 86.2), (62.8, 85.5), (100.5, 85.5), (100.5, 73.4), (62.8, 73.4),
     (62.2, 72.7), (62.2, 17.9)],
    [(379.4, -189.9), (379.4, -178.7), (469.8, -178.7), (470.4, -178.1), (470.4, 72.7), (469.8, 73.4),
     (350.7, 73.4), (350.7, 85.5), (352.6, 86.2), (352.6, 117.1), (359.0, 117.4), (359.0, 86.2),
     (359.7, 85.5), (469.8, 85.5), (470.4, 86.2), (470.4, 124.8), (481.5, 124.8), (481.5, -189.6)],
]
WALL_RECTS = [(172.6, 73.4, 304.4, 85.5)]
WINDOWS = [(52.3, 343.7, 56.5, 398.3), (476.4, 230.7, 480.3, 262.3),
           (52.3, 139.7, 56.5, 194.3), (476.4, 125.4, 480.3, 157.9)]
TREADS = [351.2, 362.1, 373.1, 384.1, 395.1, 406.1, 417.0]

B1_X = 273.8           # senterlinje B1 (xo)
B2_X = 333.4           # senterlinje B2 (xo)
B1_Y = (101.1, 308.3)  # senter opplegg (yo)
B2_Y = (308.3, 502.45)
GAVL_Y = 437.3
BOD_X = 303.0


def plan_geometry() -> str:
    """Alt som tegnes i originalkoordinater (inne i rotert gruppe)."""
    g = []
    x0, y0, x1, y1 = PLAN_CROP
    g.append(f'<clipPath id="planclip"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}"/></clipPath>')
    g.append('<g clip-path="url(#planclip)">')

    # Lastbredde (tonet felt) – under alt annet
    g.append(rect(171.8, B1_Y[0], 316.3, B1_Y[1], fill=BAND))
    g.append(rect(290.8, B2_Y[0] + 0.1 * 56.693, B2_X, B2_Y[0] + 2.1 * 56.693, fill=BAND))

    # Eksisterende vegger
    for w in WALLS:
        g.append(poly(w, fill=WALL))
    for r in WALL_RECTS:
        g.append(rect(*r, fill=WALL))
    for r in WINDOWS:
        g.append(rect(*r, fill="#fff", stroke=STAIR, stroke_width=0.35))

    # Trapp
    g.append(rect(340.2, 314.6, 471.7, 427.3, fill="none", stroke=STAIR, stroke_width=0.4))
    for (ya, yb) in [(314.6, 366.3), (375.0, 427.3)]:
        g.append(rect(340.2, ya, 428.0, yb, fill="#fff", stroke=STAIR, stroke_width=0.4))
        for t in TREADS:
            g.append(line(t, ya, t, yb, stroke=STAIR, stroke_width=0.35))

    # Under gulvet (stiplet grått): grunnmur, betongkloss, IPN 200, betongsøyle
    dash_u = dict(fill="none", stroke=UNDER, stroke_width=0.55, stroke_dasharray="3.2 2.2")
    g.append(rect(61.0, 301.0, 471.9, 315.3, **dash_u))
    g.append(rect(262.2, 84.0, 285.4, 135.0, **dash_u))
    g.append(line(270.0, 82.0, 270.0, 301.0, **dash_u))
    g.append(line(277.6, 82.0, 277.6, 301.0, **dash_u))
    g.append(circle(B2_X, 502.45, 5.7, **dash_u))

    # Bjelkelaget over gangen (stiplet)
    for yy in (343.0, 377.0, 411.0):
        g.append(line(246.0, yy, 330.7, yy, stroke=UPPER, stroke_width=0.6, stroke_dasharray="4.2 2.4"))
    # Takbjelker under takterrassen (stiplet blått)
    for yy in (454.0, 488.0):
        g.append(line(246.0, yy, 421.9, yy, stroke=SNOW, stroke_width=0.65, stroke_dasharray="4.2 2.4"))

    # Vegger i 2. etasje (strekpunktert)
    dd = dict(stroke=UPPER, stroke_width=0.65, stroke_dasharray="10 2.4 1.6 2.4")
    g.append(line(BOD_X, 50.0, BOD_X, 297.0, **dd))
    g.append(line(57.0, GAVL_Y, 475.7, GAVL_Y, **dd))

    # Teglpipe
    g.append(rect(273.8, 75.3, 296.8, 98.3, fill="#f7e7e0"))
    g.append(rect(273.8, 75.3, 296.8, 98.3, fill="url(#brick)", stroke=BRICK, stroke_width=0.6))

    # Nye stålbjelker + opplegg (svart)
    g.append(rect(271.2, 98.3, 276.4, 309.7, fill=STEEL))
    g.append(rect(330.8, 306.9, 335.9, 505.2, fill=STEEL))
    for r in [(271.0, 98.3, 276.6, 103.9), (271.0, 304.1, 276.6, 312.5),
              (330.6, 304.1, 336.1, 312.5), (330.6, 499.7, 336.1, 505.2)]:
        g.append(rect(*r, fill=SUPPORT))

    # Opprinnelig hjørnestolpe (rødt kryss)
    s = 3.9
    for (a, b, c, d) in [(-s, -s, s, s), (-s, s, s, -s)]:
        g.append(line(B2_X + a, GAVL_Y + b, B2_X + c, GAVL_Y + d, stroke="#fff", stroke_width=2.6))
        g.append(line(B2_X + a, GAVL_Y + b, B2_X + c, GAVL_Y + d, stroke=RED, stroke_width=1.1))
    g.append("</g>")
    return "".join(g)


def plan_annotations() -> str:
    """Tekst, mål og nummererte merker i arkkoordinater."""
    a = []
    # Romnavn
    rooms = [("Kjøkken", 120.0, 214.0), ("Vaskerom", 416.3, 147.3), ("Bod", 416.3, 255.1),
             ("Bad", 135.6, 385.2), ("Trapp", 448.0, 348.6), ("Soverom", 137.5, 496.0),
             ("Entré", 290.0, 509.4)]
    for name, xo, yo in rooms:
        x, y = P(xo, yo)
        a.append(text(x, y + 2.5, name, size=7.2, fill=MUTED, anchor="middle", halo=2.2))
    x, y = P(123.5, 496.0)
    a.append(text(x, y + 2.5, "takterrasse over", size=6.6, fill=SNOW, anchor="middle", italic=True, halo=2.2))

    # Teglpipe
    x, y = P(285.3, 75.3)
    a.append(text(x - 3, y - 8.5, "teglpipe", size=6, fill=BRICK, anchor="end", halo=2))

    # Bjelkebetegnelser
    x0, _ = P(B1_X, B1_Y[0])
    x1, yb = P(B1_X, B1_Y[1])
    xm = x0 + (x1 - x0) * 0.70
    a.append(text(xm, yb - 7.5, "B1  IPE 180", size=8.6, weight=700, fill=STEEL, anchor="middle", halo=2.4, halo_color=BAND))
    a.append(text(xm, yb + 13.5, "L = 3,63 m · snitt ark 2", size=6.4, fill=STEEL, anchor="middle", halo=2.4, halo_color=BAND))

    x0, _ = P(B2_X, B2_Y[0])
    x1, yb = P(B2_X, B2_Y[1])
    xm = x0 + (x1 - x0) * 0.33
    a.append(text(xm, yb - 20.6, "B2  IPE 180", size=8.6, weight=700, fill=STEEL, anchor="middle", halo=2.6))
    a.append(text(xm, yb - 9.6, "L = 3,40 m · snitt ark 3", size=6.4, fill=STEEL, anchor="middle", halo=2.6))

    # Mål: felt over kjøkkenet (vinkelrett på B1)
    X, _ = P(0, 158.7)
    ys = [P(x, 158.7)[1] for x in (358.85, B1_X, 69.7)]
    a.append(dim_v(X, ys, ["felt 1,50", "felt 3,60"], color=INK2))
    # Lastbredde B1
    X, _ = P(0, 189.9)
    ys = [P(x, 189.9)[1] for x in (316.3, B1_X, 171.8)]
    a.append(dim_v(X, ys, ["0,75", "1,80"], color=STEEL, weight=600))
    _, yl = P(171.8, 0)
    a.append(text(X + 4, yl - 16, "lastbredde B1 = 2,55 m", size=6.6, weight=600, fill=STEEL, halo=2.2, halo_color=BAND))
    a.append(text(X + 4, yl - 7.5, "= 3,60/2 + 1,50/2", size=6.2, fill=STEEL, halo=2.2, halo_color=BAND))

    # Felt over gangen + lastbredde B2
    X, _ = P(0, 327.1)
    ys = [P(x, 327.1)[1] for x in (B2_X, 245.6)]
    a.append(dim_v(X, ys, ["felt ca. 1,50"], color=INK2))
    X2, _ = P(0, 354.3)
    ys = [P(x, 354.3)[1] for x in (B2_X, 290.8)]
    a.append(dim_v(X2, ys, ["0,75"], color=STEEL, weight=600, side=1))
    _, yl = P(290.8, 0)
    a.append(text(X2 + 3, yl + 8.5, "lastbredde B2 = 0,75 m", size=6.6, weight=600, fill=STEEL, halo=2.2))
    a.append(text(X2 + 3, yl + 17, "= 1,50/2, langs trappa", size=6.2, fill=STEEL, halo=2.2))

    # Takbjelker: felt
    for yo in (454.0,):
        X, _ = P(0, yo)
        y_a = P(288.0, 0)[1]
        y_b = P(378.9, 0)[1]
        a.append(text(X - 2.8, y_a, "ca. 1,50", size=6.0, fill=SNOW, anchor="middle", rot=-90, halo=2))
        a.append(text(X - 2.8, y_b, "ca. 1,65", size=6.0, fill=SNOW, anchor="middle", rot=-90, halo=2))

    # Nummererte merker (se merknader i høyre felt)
    def C(num, cxo, cyo, txo, tyo, color=INK):
        cx, cy = P(cxo, cyo)
        tx, ty = P(txo, tyo)
        return callout(cx, cy, num, tx, ty, color=color)

    a.append(C(1, 322.0, 78.0, BOD_X, 112.0))
    a.append(C(2, 402.0, 172.0, 352.0, 158.7))
    a.append(C(3, 232.0, 120.0, 270.0, 150.0))
    a.append(C(4, 236.0, 392.0, 258.0, 377.0))
    a.append(C(5, 309.5, 422.0, B2_X - 3.2, GAVL_Y - 3.2, color=RED))
    a.append(C(6, 160.0, 425.0, 160.0, GAVL_Y))
    a.append(C(7, 445.0, 471.0, 421.0, 488.0, color=SNOW))
    return "".join(a)


def sheet1() -> str:
    svg = []
    svg.append(title_row("Plan 1. etasje – utsnitt", "1:50", 4, 56.693, 1))
    svg.append(f'<g transform="{plan_group_transform()}">{plan_geometry()}</g>')
    svg.append(plan_annotations())

    def sw(kind):
        """Små linjeprøver til merknader/tegnforklaring."""
        w, h = 22, 8
        body = {
            "dashdot": f'<line x1="0" y1="4" x2="22" y2="4" stroke="{UPPER}" stroke-width="1" stroke-dasharray="9 2.4 1.6 2.4"/>',
            "dash": f'<line x1="0" y1="4" x2="22" y2="4" stroke="{UPPER}" stroke-width="1" stroke-dasharray="4.2 2.4"/>',
            "blue": f'<line x1="0" y1="4" x2="22" y2="4" stroke="{SNOW}" stroke-width="1" stroke-dasharray="4.2 2.4"/>',
            "under": f'<line x1="0" y1="4" x2="22" y2="4" stroke="{UNDER}" stroke-width="0.9" stroke-dasharray="3.2 2.2"/>',
            "red": f'<path d="M7.5,0.8 l6.4,6.4 M13.9,0.8 l-6.4,6.4" stroke="{RED}" stroke-width="1.3"/>',
            "dim": f'<line x1="1" y1="4" x2="21" y2="4" stroke="{INK2}" stroke-width="0.6"/><path d="M-0.6,6 l3.2,-4 M19.4,6 l3.2,-4" stroke="{INK2}" stroke-width="0.7"/>',
            "steel": f'<rect x="0" y="2" width="22" height="4" fill="{STEEL}"/>',
            "support": f'<rect x="8" y="1" width="6" height="6" fill="{SUPPORT}"/>',
            "band": f'<rect x="0" y="0" width="22" height="8" fill="{BAND}"/>',
            "wall": f'<rect x="0" y="0" width="22" height="8" fill="{WALL}"/>',
            "brick": f'<rect x="7" y="0" width="8" height="8" fill="#f7e7e0" stroke="{BRICK}" stroke-width="0.6"/>',
        }[kind]
        return f'<svg class="sw" viewBox="-1 0 24 {h}" width="{w}pt" height="{h}pt">{body}</svg>'

    notes = [
        (1, "dashdot", INK, "Bodvegg i 2. etasje", "0,5 m fra B1 – bærer ikke taklast."),
        (2, "dim", INK, "Bjelkelaget over kjøkkenet",
         "Felt 3,60 m og 1,50 m – fire nye bjelker går ca. 0,5 m forbi B1."),
        (3, "under", INK, "IPN 200 under gulvet",
         "Rett under B1 – fra betongklossen til stålkonsollen i grunnmuren."),
        (4, "dash", INK, "Bjelkelaget over gangen",
         "Langs trappeåpningen: fra badveggen til trappevekslingen på B2."),
        (5, "red", RED, "Opprinnelig hjørnestolpe",
         "Fjernet 2018 – 2,25 m fra grunnmuren og 1,15 m fra betongsøylen (senter opplegg)."),
        (6, "dashdot", INK, "Gavlvegg i 2. etasje",
         "Sperretak uten mønsås – taket bæres av tidligere yttervegg ved badveggen og av ytterveggen."),
        (7, "blue", SNOW, "Takbjelker under takterrassen",
         "Fra soveromsveggen til ytterveggen – to av dem ligger også på B2."),
    ]
    note_html = "".join(
        f'<li><span class="num" style="color:{c};border-color:{c}">{i}</span>'
        f'<div><div class="nt">{esc(t)} {sw(k)}</div><div class="nb">{esc(b)}</div></div></li>'
        for i, k, c, t, b in notes)

    legend = [
        ("steel", "Ny stålbjelke IPE 180 (B1, B2)"),
        ("support", "Opplegg (svart) – se snittene for B1 og B2"),
        ("band", "Lastbredde – gulvlast som går til bjelken"),
        ("under", "Under gulvet (stiplet grått): grunnmur, IPN 200, betongkloss, betongsøyle"),
        ("wall", "Eksisterende vegger i 1. etasje"),
    ]
    legend_html = "".join(f'<li>{sw(k)}<span>{esc(t)}</span></li>' for k, t in legend)

    beams = f"""
    <div class="beam">
      <div class="bh"><span class="bid">B1</span><span class="bp">IPE 180 · S235 · kjøkkenbjelke</span><span class="ref">ark 2</span></div>
      <dl>
        <dt>Spenn</dt><dd>L = 3,63 m (senter opplegg)</dd>
        <dt>Opplegg</dt><dd>teglsteinspipa – grunnmuren</dd>
        <dt>Last</dt><dd>etasjeskille og nyttelast, lastbredde 2,55 m</dd>
        <dt>Utnyttelse</dt><dd>moment 64 % · nedbøyning 60 %<br><span class="m">følsomhet (full kontinuitet) 91 %</span></dd>
      </dl>
    </div>
    <div class="beam">
      <div class="bh"><span class="bid">B2</span><span class="bp">IPE 180 · S235 · gangbjelke</span><span class="ref">ark 3</span></div>
      <dl>
        <dt>Spenn</dt><dd>L = 3,40 m (senter opplegg)</dd>
        <dt>Opplegg</dt><dd>grunnmuren – betongsøylen</dd>
        <dt>Last</dt><dd>gulv (lastbredde 0,75 m), trapp, gavlvegg og to takbjelker med snøfonn</dd>
        <dt>Utnyttelse</dt><dd>moment 65 % · nedbøyning 54 %<br><span class="m amber">søyleopplegget: til kontroll</span></dd>
      </dl>
    </div>"""

    strip = f"""
    <div class="strip">
      <h3>Oversikt</h3>
      {beams}
      <h3>Merknader</h3>
      <ol class="notes">{note_html}</ol>
      <h3>Tegnforklaring</h3>
      <ul class="legend">{legend_html}</ul>
    </div>"""
    return sheet("".join(svg), strip + foot("Plan 1. etasje – utsnitt", "1:50 (A4)", 1))


# ===========================================================================
# SNITT 1:25
# ===========================================================================
def wood(x0, y0, x1, y1, fill=WOOD_FILL, w=0.5):
    return rect(x0, y0, x1, y1, fill=fill, stroke=WOOD, stroke_width=w)


def wood_x(x0, y0, x1, y1):
    """Gjennomskåret trebjelke (kryss)."""
    return (wood(x0, y0, x1, y1)
            + line(x0, y0, x1, y1, stroke=WOOD, stroke_width=0.35)
            + line(x0, y1, x1, y0, stroke=WOOD, stroke_width=0.35))


def steel_beam(x0, y0, x1, y1, fl=1.25):
    return (rect(x0, y0, x1, y1, fill=STEEL_FILL, stroke=STEEL, stroke_width=0.8)
            + line(x0, y0 + fl, x1, y0 + fl, stroke=STEEL, stroke_width=0.3)
            + line(x0, y1 - fl, x1, y1 - fl, stroke=STEEL, stroke_width=0.3))


def concrete(x0, y0, x1, y1):
    return (rect(x0, y0, x1, y1, fill=CONC)
            + rect(x0, y0, x1, y1, fill="url(#conc)", stroke="#8f8a83", stroke_width=0.45))


def logwall(x0, y0, x1, y1, joints):
    out = [rect(x0, y0, x1, y1, fill=LOG_FILL)]
    for y in joints:
        out.append(line(x0, y, x1, y, stroke="#cfc4b2", stroke_width=0.35))
    out.append(line(x0, y0, x0, y1, stroke=WOOD, stroke_width=0.45))
    out.append(line(x1, y0, x1, y1, stroke=WOOD, stroke_width=0.45))
    return "".join(out)


def ground(x0, x1, y):
    return (rect(x0, y, x1, y + 5.5, fill="url(#ground)")
            + line(x0, y, x1, y, stroke="#7d735f", stroke_width=0.6))


def load_arrows(xs, y_top, y_tip, color=INK2, w=0.5):
    out = [line(xs[0], y_top, xs[-1], y_top, stroke=color, stroke_width=w)]
    for x in xs:
        out.append(line(x, y_top, x, y_tip - 2.4, stroke=color, stroke_width=w))
        out.append(poly([(x - 1.6, y_tip - 3.2), (x + 1.6, y_tip - 3.2), (x, y_tip)], fill=color))
    return "".join(out)


def break_lines(x0, x1, ya, yb, color="#7d858f"):
    """To brudd-linjer (del av høyden er utelatt)."""
    out = []
    for y in (ya, yb):
        xm = (x0 + x1) / 2
        z = 3.2
        pts = [(x0, y), (xm - z, y), (xm - z * 0.4, y - z), (xm + z * 0.4, y + z), (xm + z, y), (x1, y)]
        out.append(poly(pts, closed=False, fill="none", stroke=color, stroke_width=0.45))
    return "".join(out)


def broken(content, A, B, G, xr, yr, cid):
    """Tegner `content` to ganger med klipping: over A og under B (flyttet opp)."""
    shift = -(B - A) + G
    x0, x1 = xr
    y0, y1 = yr
    return (f'<clipPath id="{cid}t"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{A - y0}"/></clipPath>'
            f'<clipPath id="{cid}b"><rect x="{x0}" y="{B}" width="{x1 - x0}" height="{y1 - B}"/></clipPath>'
            f'<g clip-path="url(#{cid}t)">{content}</g>'
            f'<g transform="translate(0,{n(shift)})"><g clip-path="url(#{cid}b)">{content}</g></g>')


def ymap(y, A, B, G):
    if y <= A:
        return y
    if y >= B:
        return y - (B - A) + G
    raise ValueError(f"y={y} ligger i bruddet")


# ---------------------------------------------------------------------------
# Snitt B1
# ---------------------------------------------------------------------------
B1A, B1B, B1G = 186.0, 342.0, 9.0      # brudd (original y)
B1_SX, B1_SY = -6.0, 8.0               # plassering på arket


def section_b1_geometry() -> str:
    g = []
    # Teglsteinspipe
    g.append(rect(55.7, 56.0, 101.7, 489.3, fill="#faf0eb"))
    g.append(rect(55.7, 56.0, 101.7, 489.3, fill="url(#brick)"))
    g.append(line(55.7, 56.0, 55.7, 489.3, stroke=BRICK, stroke_width=0.6))
    g.append(line(101.7, 56.0, 101.7, 489.3, stroke=BRICK, stroke_width=0.6))
    # Tømmervegg mot grunnmuren
    g.append(logwall(509.5, 65.2, 533.8, 367.4, [65.3 + 16.79 * i for i in range(18)]))
    # Ground + grunnmur + betongkloss
    g.append(ground(62.0, 550.0, 473.4))
    g.append(concrete(73.2, 414.8, 175.2, 489.3))
    g.append(concrete(507.5, 384.1, 535.8, 489.3))
    g.append(rect(60, 489.3 - 0.2, 552, 500, fill="url(#groundfade)"))
    # Etasjeskille over B1
    g.append(wood(101.7, 91.3, 509.5, 95.5))
    for x in (151.8, 219.8, 287.8, 355.9, 423.9, 491.9):
        g.append(wood_x(x, 95.5, x + 5.4, 112.3))
    # Stendere
    g.append(wood(101.7, 132.7, 107.2, 367.4))
    g.append(wood(107.2, 132.7, 112.8, 367.4))
    g.append(wood(513.2, 132.7, 530.0, 367.4))
    g.append(line(518.8, 134.4, 518.8, 365.7, stroke="#d8ccb9", stroke_width=0.35))
    g.append(line(524.4, 134.4, 524.4, 365.7, stroke="#d8ccb9", stroke_width=0.35))
    # B1
    g.append(steel_beam(101.7, 112.3, 524.3, 132.7))
    # Gulv 1. etasje + gulvbjelker
    g.append(wood(101.7, 367.4, 513.2, 369.9))
    g.append(wood(530.0, 367.4, 545.7, 369.9))
    for x in (104.5, 172.5, 240.5, 308.6, 376.6, 444.6):
        g.append(wood_x(x, 369.9, x + 5.4, 392.1))
    g.append(wood_x(513.2, 367.4, 530.0, 384.1))           # tømmerstokk 148 × 148
    # IPN 200 + stålkonsoll
    g.append(steel_beam(68.7, 392.1, 507.5, 414.8))
    g.append(poly([(505.9, 416.1), (491.6, 416.1), (505.9, 436.0)], fill=STEEL_FILL, stroke=STEEL, stroke_width=0.6))
    g.append(rect(505.9, 414.8, 507.5, 438.2, fill=STEEL))
    g.append(rect(490.4, 414.8, 507.5, 416.1, fill=STEEL))
    # Høydemål (brytes sammen med tegningen)
    g.append(dim_v(260.8, [132.7, 367.4], [None], color=INK))
    return "".join(g)


def section_b1() -> str:
    A, B, G = B1A, B1B, B1G
    Y = lambda y: ymap(y, A, B, G)  # noqa: E731
    out = [broken(section_b1_geometry(), A, B, G, (40, 570), (40, 560), "b1")]
    out.append(break_lines(50, 548, A + 0.6, A + G - 0.6))

    # Last
    xs = [118.7, 172.1, 225.5, 278.9, 332.3, 385.7, 439.1, 492.5]
    out.append(load_arrows(xs, 74.0, 89.3))
    out.append(text(305.6, 68.0, "etasjeskille og nyttelast", size=6.8, fill=INK2, anchor="middle"))
    # Bjelketekst
    out.append(text(313.0, 125.0, "IPE 180 – B1", size=7.8, weight=700, fill=STEEL, anchor="middle"))
    out.append(text(328.0, Y(405.8), "IPN 200", size=7.0, weight=600, fill=STEEL, anchor="middle"))
    out.append(text(486.0, Y(428.0) + 2.4, "stålkonsoll", size=6.0, fill=INK2, anchor="end"))
    out.append(text(86.0, 150.0, "teglsteinspipe", size=6.2, fill=BRICK, anchor="middle", rot=-90, halo=2.4,
                    halo_color="#faf0eb"))
    # L-mål
    out.append(dim_h(152.0, [107.25, 518.75], [None], color=INK))
    out.append(text(313.0, 155.0, "L = 3,63 m (senter opplegg)", size=7.2, weight=600, fill=INK,
                    anchor="middle", halo=4))
    # Høydemål – tekst
    out.append(text(257.6, 168.0, "2,07", size=6.8, weight=600, fill=INK, anchor="end", rot=-90))
    out.append(text(266.0, 167.0, "underkant stendere –", size=5.9, fill=MUTED))
    out.append(text(266.0, 174.5, "underkant stålbjelke", size=5.9, fill=MUTED))
    # Mål under
    yb1, yb2 = Y(501.0), Y(517.0)
    out.append(line(107.25, Y(478.5), 107.25, yb1 + 3, stroke=MUTED, stroke_width=0.35))
    out.append(line(175.2, Y(478.5), 175.2, yb2 + 3, stroke=MUTED, stroke_width=0.35))
    out.append(line(73.2, Y(490.5), 73.2, yb2 + 3, stroke=MUTED, stroke_width=0.35))
    out.append(dim_h(yb1, [107.25, 175.2], ["ca. 0,60"], color=INK))
    out.append(dim_h(yb2, [73.2, 175.2], ["0,90 betongkloss"], color=INK))
    out.append(text(521.6, Y(501.0) + 6, "grunnmur", size=6.0, fill=MUTED, anchor="middle"))
    # Merker for opplegg
    out.append(callout(124.0, Y(352.0), 1, 112.8, Y(352.0)))
    out.append(callout(496.0, Y(352.0), 2, 513.2, Y(352.0)))
    return f'<g transform="translate({n(B1_SX)},{n(B1_SY)})">{"".join(out)}</g>'


# ---------------------------------------------------------------------------
# Snitt B2
# ---------------------------------------------------------------------------
B2A, B2B, B2G = 191.0, 368.0, 9.0
B2_SX, B2_SY = 10.0, 12.0


def section_b2_geometry() -> str:
    g = []
    # Tømmervegg mot grunnmuren (venstre)
    g.append(logwall(98.8, 65.2, 123.0, 384.4, [65.3 + 16.79 * i for i in range(19)]))
    # Ground, grunnmur, betongsøyle
    g.append(ground(80.0, 540.0, 490.4))
    g.append(concrete(96.7, 401.2, 125.1, 506.3))
    g.append(concrete(487.9, 415.9, 510.6, 506.3))
    g.append(line(499.25, 418, 499.25, 446, stroke=STEEL, stroke_width=0.5, stroke_dasharray="2 1.6"))
    g.append(rect(80, 506.1, 540, 516, fill="url(#groundfade)"))
    # Gulv fra badsiden: gulv + trappeveksling
    g.append(wood(123.0, 91.3, 358.6, 95.5))
    g.append(wood(123.0, 95.5, 349.0, 112.3))
    g.append(line(124.7, 101.1, 347.3, 101.1, stroke="#cdbfa8", stroke_width=0.35))
    g.append(line(124.7, 106.7, 347.3, 106.7, stroke="#cdbfa8", stroke_width=0.35))
    # Gavlvegg i 2. etasje
    g.append(wood(358.6, 46.0, 379.0, 95.5))
    g.append(line(365.4, 47.5, 365.4, 93.8, stroke="#d8ccb9", stroke_width=0.35))
    g.append(line(372.2, 47.5, 372.2, 93.8, stroke="#d8ccb9", stroke_width=0.35))
    g.append(wood_x(366.1, 95.5, 371.6, 112.3))
    # Takterrasse
    g.append(rect(379.0, 91.3, 534.0, 95.5, fill="#e6eef6", stroke="#8aa3bb", stroke_width=0.4))
    g.append(rect(396.1, 87.2, 534.0, 91.3, fill="#eef3f8", stroke="#8aa3bb", stroke_width=0.4))
    g.append(rect(396.1, 84.0, 534.0, 87.2, fill="#f6f9fb", stroke="#8aa3bb", stroke_width=0.4))
    for x in (400.1, 468.2):
        g.append(wood_x(x, 95.5, x + 5.4, 112.3))
    # Stendere
    g.append(wood(102.5, 132.7, 119.3, 384.4))
    g.append(line(108.1, 134.4, 108.1, 382.7, stroke="#d8ccb9", stroke_width=0.35))
    g.append(line(113.7, 134.4, 113.7, 382.7, stroke="#d8ccb9", stroke_width=0.35))
    g.append(wood(493.7, 132.7, 499.2, 384.4))
    g.append(wood(499.2, 132.7, 504.8, 384.4))
    g.append(wood(504.8, 132.7, 510.2, 384.4, fill="#f6f1e7"))
    # B2
    g.append(steel_beam(108.2, 112.3, 504.8, 132.7))
    # Gulv 1. etasje + gulvbjelker + tømmerstokk
    g.append(wood(85.0, 384.4, 102.5, 386.9))
    g.append(wood(119.3, 384.4, 534.0, 386.9))
    for x in (156.4, 224.4, 292.4, 360.5, 428.5, 496.5):
        g.append(wood_x(x, 386.9, x + 5.4, 409.1))
    g.append(wood_x(102.5, 384.4, 119.3, 401.2))
    # Stolpesko + stålplate
    g.append(rect(495.7, 409.1, 502.7, 410.0, fill=STEEL))
    g.append(rect(495.7, 400.0, 496.4, 410.0, fill=STEEL))
    g.append(rect(502.1, 400.0, 502.7, 410.0, fill=STEEL))
    g.append(rect(497.9, 410.0, 500.6, 415.9, fill=STEEL))
    # Høydemål
    g.append(dim_v(260.8, [132.7, 384.4], [None], color=INK))
    return "".join(g)


def section_b2() -> str:
    A, B, G = B2A, B2B, B2G
    Y = lambda y: ymap(y, A, B, G)  # noqa: E731
    out = [broken(section_b2_geometry(), A, B, G, (40, 570), (30, 560), "b2")]
    out.append(break_lines(84, 546, A + 0.6, A + G - 0.6))

    # Laster
    out.append(load_arrows([140.0, 188.0, 236.0, 284.0, 332.0], 74.0, 89.3))
    out.append(text(236.0, 68.0, "gulv fra badsiden, via trappevekslingen", size=6.8, fill=INK2, anchor="middle"))
    out.append(line(368.8, 58.0, 368.8, 88.5, stroke="#fff", stroke_width=2.2))
    out.append(line(368.8, 58.0, 368.8, 86.0, stroke=INK2, stroke_width=0.6))
    out.append(poly([(367.2, 85.2), (370.4, 85.2), (368.8, 88.6)], fill=INK2))
    out.append(text(368.8, 40.5, "gavlvegg i 2. etasje", size=6.2, fill=INK2, anchor="middle"))
    out.append(load_arrows([402.9, 470.9], 70.0, 83.0, color=SNOW, w=0.6))
    out.append(text(436.9, 64.0, "terrasse og snø, via to takbjelker", size=6.8, fill=SNOW, anchor="middle"))
    out.append(text(170.0, 106.2, "trappeveksling", size=5.8, fill=WOOD, anchor="middle", halo=2.6,
                    halo_color=WOOD_FILL))
    # Bjelketekst
    out.append(text(240.0, 125.0, "IPE 180 – B2", size=7.8, weight=700, fill=STEEL, anchor="middle"))
    # Opprinnelig hjørnestolpe
    cx, cy, s = 368.8, 139.0, 3.6
    out.append(line(cx - s, cy - s, cx + s, cy + s, stroke=RED, stroke_width=1.1))
    out.append(line(cx - s, cy + s, cx + s, cy - s, stroke=RED, stroke_width=1.1))
    out.append(text(cx + 7, cy + 2.3, "opprinnelig hjørnestolpe, fjernet 2018", size=6.0, fill=RED))
    # L-mål
    out.append(dim_h(157.0, [113.75, 499.25], [None], color=INK))
    out.append(text(306.5, 160.0, "L = 3,40 m (senter opplegg)", size=7.2, weight=600, fill=INK,
                    anchor="middle", halo=4))
    # Høydemål – tekst
    out.append(text(257.6, 173.0, "2,22", size=6.8, weight=600, fill=INK, anchor="end", rot=-90))
    out.append(text(266.0, 172.0, "underkant stendere –", size=5.9, fill=MUTED))
    out.append(text(266.0, 179.5, "underkant stålbjelke", size=5.9, fill=MUTED))
    # Mål under
    yd = Y(513.3)
    for x in (113.7, 368.8, 499.2):
        out.append(line(x, Y(494.9), x, yd + 3, stroke=MUTED, stroke_width=0.35))
    out.append(dim_h(yd, [113.7, 368.8, 499.2], ["2,25", "1,15"], color=INK, size=6.8, weight=600))
    out.append(text(113.7, yd + 10.5, "grunnmur", size=6.0, fill=MUTED, anchor="middle"))
    out.append(text(368.8, yd + 10.5, "opprinnelig hjørnestolpe", size=6.0, fill=RED, anchor="middle"))
    out.append(text(499.2, yd + 10.5, "betongsøyle", size=6.0, fill=MUTED, anchor="middle"))
    # Merker for opplegg
    out.append(callout(136.0, Y(370.0), 1, 119.3, Y(370.0)))
    out.append(callout(476.0, Y(370.0), 2, 493.7, Y(370.0)))
    return f'<g transform="translate({n(B2_SX)},{n(B2_SY)})">{"".join(out)}</g>'


# ---------------------------------------------------------------------------
# Nøkkelplan (liten plan med aktuell bjelke uthevet)
# ---------------------------------------------------------------------------
def key_plan(highlight: str, width_pt: float) -> str:
    xo0, yo0, xo1, yo1 = PLAN_CROP
    w_o, h_o = yo1 - yo0, xo1 - xo0
    k = width_pt / w_o
    h = h_o * k
    walls = "".join(poly(w, fill="#b9c0c8") for w in WALLS) + "".join(rect(*r, fill="#b9c0c8") for r in WALL_RECTS)
    beams = []
    for name, x, (ya, yb) in (("B1", B1_X, B1_Y), ("B2", B2_X, B2_Y)):
        on = name == highlight
        beams.append(line(x, ya, x, yb, stroke=STEEL if on else "#9aa7b4", stroke_width=11 if on else 6))
    inner = (f'<clipPath id="kp{highlight}"><rect x="{xo0}" y="{yo0}" width="{h_o}" height="{w_o}"/></clipPath>'
             f'<g clip-path="url(#kp{highlight})">{walls}{"".join(beams)}</g>')
    tr = f"translate({n(-yo0 * k)},{n((xo1 - 5.5) * k)}) scale({n(k)}) rotate(-90)"
    # tekst
    lab = []
    for name, x, (ya, yb) in (("B1", B1_X, B1_Y), ("B2", B2_X, B2_Y)):
        on = name == highlight
        px = ((ya + yb) / 2 - yo0) * k
        py = (xo1 - 5.5 - x) * k
        lab.append(text(px, py - 3.2, name, size=5.4, weight=700 if on else 500,
                        fill=STEEL if on else MUTED, anchor="middle", halo=1.8))
    return (f'<svg viewBox="0 0 {n(width_pt)} {n(h)}" width="{n(width_pt)}pt" height="{n(h)}pt">'
            f'<g transform="{tr}">{inner}</g>{"".join(lab)}</svg>')


# ---------------------------------------------------------------------------
# Beregningspanel (HTML)
# ---------------------------------------------------------------------------
def bar(pct, tone="dark"):
    return f'<span class="bar {tone}"><i style="width:{pct}%"></i></span>'


def calc_b1_diagram() -> str:
    W, H = mm(78), mm(19)
    x0, x1 = 10.0, W - 10.0
    yb = 30.0
    out = []
    # jevnt fordelt last
    out.append(rect(x0, yb - 11, x1, yb - 1.2, fill=STEEL, fill_opacity=0.07))
    out.append(line(x0, yb - 11, x1, yb - 11, stroke=INK2, stroke_width=0.5))
    k = 16
    for i in range(k + 1):
        x = x0 + (x1 - x0) * i / k
        out.append(line(x, yb - 11, x, yb - 3.2, stroke=INK2, stroke_width=0.4))
        out.append(poly([(x - 1.1, yb - 3.6), (x + 1.1, yb - 3.6), (x, yb - 1.4)], fill=INK2))
    out.append(text((x0 + x1) / 2, yb - 14, "q" + sub("Ed", 6.2) + " = 12,70 kN/m", size=6.2,
                    fill=INK, anchor="middle", raw=True))
    out.append(line(x0, yb, x1, yb, stroke=STEEL, stroke_width=1.8))
    for x in (x0, x1):
        out.append(poly([(x, yb + 0.9), (x - 3.2, yb + 6), (x + 3.2, yb + 6)], fill="#fff", stroke=INK, stroke_width=0.5))
    out.append(dim_h(yb + 13, [x0, x1], ["3,63"], color=INK2, size=6))
    return f'<svg viewBox="0 0 {n(W)} {n(H)}" width="{n(W)}pt" height="{n(H)}pt">{"".join(out)}</svg>'


def calc_b2_diagram() -> str:
    W, H = mm(78), mm(26)
    x0, x1 = 10.0, W - 10.0
    L = 3.40
    sx = lambda m: x0 + (x1 - x0) * m / L  # noqa: E731
    yb = 50.0
    out = []
    # fordelt last 4,14 kN/m, x = 0,1–2,1
    xa, xb = sx(0.1), sx(2.1)
    out.append(rect(xa, yb - 9, xb, yb - 1.2, fill=STEEL, fill_opacity=0.07))
    out.append(line(xa, yb - 9, xb, yb - 9, stroke=INK2, stroke_width=0.5))
    for i in range(9):
        x = xa + (xb - xa) * i / 8
        out.append(line(x, yb - 9, x, yb - 3.2, stroke=INK2, stroke_width=0.4))
        out.append(poly([(x - 1.1, yb - 3.6), (x + 1.1, yb - 3.6), (x, yb - 1.4)], fill=INK2))
    out.append(text(sx(0.55), yb - 11.5, "4,14 kN/m", size=5.8, fill=INK2, anchor="middle"))

    def pl(m, top, label, color):
        x = sx(m)
        r = [line(x, top, x, yb - 3, stroke=color, stroke_width=0.7),
             poly([(x - 1.5, yb - 3.6), (x + 1.5, yb - 3.6), (x, yb - 0.8)], fill=color),
             text(x, top - 2.5, label, size=5.8, fill=color, anchor="middle", halo=1.6)]
        return "".join(r)
    out.append(pl(1.20, yb - 22, "4,50 kN", INK))
    out.append(pl(2.25, yb - 27, "6,75 kN", INK))
    out.append(pl(2.55, yb - 38, "15,12 kN", SNOW))
    out.append(pl(3.15, yb - 38, "15,12 kN", SNOW))
    out.append(line(x0, yb, x1, yb, stroke=STEEL, stroke_width=1.8))
    for x in (x0, x1):
        out.append(poly([(x, yb + 0.9), (x - 3.2, yb + 6), (x + 3.2, yb + 6)], fill="#fff", stroke=INK, stroke_width=0.5))
    out.append(dim_h(yb + 13, [x0, sx(2.25), x1], ["2,25", "1,15"], color=INK2, size=6))
    return f'<svg viewBox="0 0 {n(W)} {n(H)}" width="{n(W)}pt" height="{n(H)}pt">{"".join(out)}</svg>'


def calc_panel(title, spec, diagram, load_head, load_cols, loads, checks) -> str:
    lrows = "".join(
        f'<tr class="{c}"><td>{a}</td><td>{b}</td><td>{d}</td><td>{e}</td></tr>'
        for a, b, d, e, c in loads)
    crows = "".join(
        f'<tr class="{c}"><td>{a}</td><td>{b}</td><td>{d}</td><td class="u">{u}</td></tr>'
        for a, b, d, u, c in checks)
    return f"""
    <div class="calc">
      <div class="ch"><span class="ct">{title}</span><span class="cs">{spec}</span></div>
      <div class="dia">{diagram}</div>
      <table class="t">
        <thead><tr><th>{load_head}</th>{''.join(f'<th>{c}</th>' for c in load_cols)}</tr></thead>
        <tbody>{lrows}</tbody>
      </table>
      <table class="t k">
        <thead><tr><th>Kontroll</th><th>E<sub>d</sub></th><th>R<sub>d</sub></th><th>utnyttelse</th></tr></thead>
        <tbody>{crows}</tbody>
      </table>
    </div>"""


def bullets(items, cls="") -> str:
    return f'<ul class="bl {cls}">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def notes_row(cols, key_svg) -> str:
    body = "".join(f'<div class="nc">{c}</div>' for c in cols)
    return (f'<div class="nrow">{body}<div class="nc key"><div class="kh">Nøkkelplan</div>{key_svg}'
            f'</div></div>')


def support_note(num, title, lines_) -> str:
    return (f'<div class="sn"><span class="num">{num}</span><div><div class="nt">{esc(title)}</div>'
            f'<div class="nb">{"<br>".join(lines_)}</div></div></div>')


UNIT_FORUTS = "IPE 180, S235: W<sub>el</sub> = 146,3 cm³, I = 1 317 cm⁴, γ<sub>M0</sub> = 1,05."


def sheet2() -> str:
    svg = [title_row("Snitt langs B1 – kjøkkenbjelke", "1:25", 1, 113.386, 0.5),
           section_b1()]
    calc = calc_panel(
        "Beregning B1", "IPE 180 · S235 · L = 3,63 m", calc_b1_diagram(), "Laster, kN/m",
        ["g<sub>k</sub>", "q<sub>k</sub>", "q<sub>Ed</sub>"],
        [("Etasjeskille, lastbredde 2,55 m", "3,06", "5,10", "", ""),
         ("Bodvegg i 2. etasje", "0,50", "–", "", ""),
         ("IPE 180", "0,18", "–", "", ""),
         ("Sum", "3,74", "5,10", "12,70", "sum")],
        [("Moment, kNm", "<b>20,9</b>", "32,7", f"{bar(64)}<b>64 %</b>", ""),
         ("Skjær, kN", "<b>23,1</b>", "145", f"{bar(16)}<b>16 %</b>", ""),
         ("Nedbøyning, mm", "<b>7,2</b>", "12,1", f"{bar(60)}<b>60 %</b>", ""),
         ("Følsomhet, kNm", "29,7", "32,7", f"{bar(91, 'light')}91 %", "sec")])
    foruts = bullets([
        UNIT_FORUTS,
        "q<sub>Ed</sub> = 1,35 g<sub>k</sub> + 1,5 q<sub>k</sub> (forenklet, på den sikre siden). "
        "Nedbøyning med karakteristisk last mot L/300.",
        "Egenlast etasjeskille 1,2 kN/m², nyttelast bolig 2,0 kN/m², bodvegg 0,5 kN/m (tatt med fullt).",
        "Lastbredde 2,55 m = 3,60/2 + 1,50/2 (to tilstøtende spenn). Følsomhet: full kontinuitet gir "
        "3,71 m og nedbøyning 10,3 mm.",
        "Mål i meter. Krypkjellerens høyde er ikke målt.",
    ])
    strip = f'<div class="strip">{calc}<h3>Forutsetninger</h3>{foruts}</div>'
    notes = notes_row([
        support_note(1, "Opplegg ved teglsteinspipa",
                     ["2 stendere 48 × 98, skrudd fast i pipa", "→ gulvbjelke 48 × 196 → IPN 200",
                      "→ betongkloss"]),
        support_note(2, "Opplegg mot grunnmuren",
                     ["2 stendere 48 × 148 (98 mm opplegg + 50 mm inn i tømmerveggen)",
                      "på tømmerstokk 148 × 148, rett over grunnmur ca. 0,25 m"]),
        '<div class="nt">Lastvei og avstivning</div>' + bullets([
            "Bjelkelaget ligger på overflensen og holder B1 sideveis.",
            "Bodveggen i 2. etasje, 0,5 m fra B1, bærer ikke taklast (vurdert ved befaring).",
        ]),
    ], key_plan("B1", mm(26)))
    return sheet("".join(svg), strip + notes + foot("Snitt langs B1 – kjøkkenbjelke", "1:25 (A4)", 2))


def sheet3() -> str:
    svg = [title_row("Snitt langs B2 – gangbjelke", "1:25", 1, 113.386, 0.5),
           section_b2()]
    calc = calc_panel(
        "Beregning B2", "IPE 180 · S235 · L = 3,40 m", calc_b2_diagram(),
        "Laster ved snøfonn, kN/m · punktlast kN",
        ["g<sub>k</sub>", "q<sub>k</sub>", "dim."],
        [("Gulv via veksling, x = 0,1–2,1", "1,40", "1,50", "<b>4,14</b>", ""),
         ("Trapp, x = 1,20", "–", "3,00", "<b>4,50</b>", ""),
         ("Gavlvegg, x = 2,25", "5,00", "–", "<b>6,75</b>", ""),
         ("<span class='snow'>Takbjelker, x = 2,55 og 3,15</span>", "1,42", "8,80", "<b class='snow'>15,12</b>", ""),
         ("IPE 180", "0,18", "–", "<b>0,24</b>", "")],
        [("Moment, kNm", "<b>21,4</b>", "32,7", f"{bar(65)}<b>65 %</b>", ""),
         ("Skjær, kN", "<b>34,5</b>", "145", f"{bar(24)}<b>24 %</b>", ""),
         ("Nedbøyning, mm", "<b>6,2</b>", "11,3", f"{bar(54)}<b>54 %</b>", ""),
         ("Terrassebruk 4,0, kNm", "16,9", "32,7", f"{bar(52, 'light')}52 %", "sec"),
         ("Søyleopplegg, kN", "<b>34,5</b>", "–", "<span class='amber'>se til kontroll</span>", "")])
    foruts = bullets([
        UNIT_FORUTS,
        "Dimensjonerende last 1,35 g<sub>k</sub> + 1,5 q<sub>k</sub> (forenklet, på den sikre siden). "
        "Nedbøyning med karakteristisk last mot L/300.",
        "Bare last fra deler som ligger på B2. Gulv: egenlast 1,2 kN/m², nyttelast 2,0 kN/m², "
        "lastbredde 1,50/2 = 0,75 m langs trappeåpningen, veksling og rekkverk 0,5 kN/m.",
        "Takbjelkene (c/c 0,60) er sammenhengende 1,50 + 1,65 m over B2. Last på B2 per bjelke: "
        "1,972 m × 0,60 m × last per m².",
        "Terrasse: egenlast 1,2 kN/m². Snøfonn mot gavlveggen: 2 kN/m³ · 3,72 m = 7,44 kN/m² "
        "(NS-EN 1991-1-3, 5.3.6) – større enn terrassebruk 4,0 kN/m².",
        "Gavlvegg 5 kN og trapp 3 kN er anslått.",
        "Mål i meter. Krypkjellerens høyde er ikke målt.",
    ])
    check = ('<div class="check"><div class="nt">Til kontroll</div>' + bullets([
        "Søyleopplegget for R<sub>Ed</sub> = 34,5 kN: trykk vinkelrett på fiberretningen i gulvbjelken "
        "48 × 196, og videre ned via stålplate og stolpesko til betongsøylen.",
        "Feste mellom treverket og overflensen (sidestøtte for B2).",
    ]) + "</div>")
    strip = f'<div class="strip">{calc}<h3>Forutsetninger</h3>{foruts}{check}</div>'
    notes = notes_row([
        support_note(1, "Opplegg mot grunnmuren",
                     ["2 stendere 48 × 148 (98 mm opplegg + 50 mm inn i tømmerveggen)",
                      "på tømmerstokk 148 × 148, rett over grunnmur ca. 0,25 m"]),
        support_note(2, "Opplegg ved betongsøylen",
                     ["2 stendere 48 × 98, sidestøttet,",
                      "på gulvbjelke 48 × 196 → stålplate 400 mm", "→ stolpesko → betongsøyle Ø ca. 200"]),
        '<div class="nt">Lastvei og avstivning</div>' + bullets([
            "Gulvet fra badsiden ligger på trappevekslingen langs trappeåpningen. Ellers i gangen ligger "
            "bjelkene på veggene.",
            "Takterrassen ligger på bjelker mellom soveromsvegg og yttervegg – to av dem ligger også på B2.",
            "Sperretak uten mønsås – taket bæres av tidligere yttervegg og yttervegg.",
            "Trappevekslingen og takbjelkene ligger på overflensen og holder B2 sideveis.",
        ]),
    ], key_plan("B2", mm(26)))
    return sheet("".join(svg), strip + notes + foot("Snitt langs B2 – gangbjelke", "1:25 (A4)", 3))


# ---------------------------------------------------------------------------
# Inter (OFL) som TrueType-woff2 – gir kompakt, søkbar tekst i PDF-en.
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
         "U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
GREEK = "U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF"
FONT_FACES = "".join(
    f"@font-face {{ font-family: InterTT; font-style: {st}; font-weight: {w}; "
    f"src: url(../fonts/inter-{sub}-{w}-{st}.woff2) format('woff2'); unicode-range: {rng}; }}\n"
    for sub, w, st, rng in [
        ("latin", 400, "normal", LATIN), ("latin", 400, "italic", LATIN),
        ("latin", 500, "normal", LATIN), ("latin", 600, "normal", LATIN),
        ("latin", 700, "normal", LATIN), ("greek", 400, "normal", GREEK),
    ])

CSS = FONT_FACES + f"""
@page {{ size: 297mm 210mm; margin: 0; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; background: #fff; }}
body {{ font-family: InterTT, Inter, sans-serif; color: {INK}; font-size: 6.6pt; line-height: 1.38;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
        font-feature-settings: 'tnum' 1; }}
.sheet {{ width: 297mm; height: 210mm; position: relative; overflow: hidden;
          break-after: page; page-break-after: always; }}
.sheet:last-child {{ break-after: auto; page-break-after: auto; }}
svg.draw {{ position: absolute; inset: 0; width: 297mm; height: 210mm; }}
sub {{ font-size: 72%; vertical-align: -0.28em; line-height: 0; }}
b {{ font-weight: 600; }}
.m {{ color: {MUTED}; }}
.amber {{ color: {AMBER}; }}
.snow {{ color: {SNOW}; }}

.strip {{ position: absolute; left: {STRIP_X}mm; top: 10mm; width: {STRIP_W}mm; height: {FOOT_TOP - 14}mm; }}
.strip::before {{ content: ''; position: absolute; left: -4mm; top: 0; bottom: 0; border-left: 0.6pt solid {HAIR}; }}
h3 {{ font-size: 5.8pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
      color: {MUTED}; margin: 4.2mm 0 1.6mm; padding-top: 1.6mm; border-top: 0.6pt solid {HAIR}; }}
.strip > h3:first-child {{ margin-top: 0; padding-top: 0; border-top: 0; }}

/* Oversikt */
.beam {{ margin-bottom: 2.4mm; }}
.bh {{ display: flex; align-items: baseline; gap: 2mm; margin-bottom: 0.8mm; }}
.bid {{ font-size: 9pt; font-weight: 700; color: {STEEL}; }}
.bp {{ color: {INK2}; flex: 1; }}
.ref {{ font-size: 5.8pt; color: {STEEL}; border: 0.6pt solid {STEEL}; border-radius: 6pt; padding: 0 1.6mm; }}
.beam dl {{ display: grid; grid-template-columns: 15mm 1fr; margin: 0; row-gap: 0.25mm; }}
.beam dt {{ color: {MUTED}; }}
.beam dd {{ margin: 0; }}

/* Merknader */
ol.notes {{ list-style: none; margin: 0; padding: 0; }}
ol.notes li {{ display: grid; grid-template-columns: 5.6mm 1fr; margin-bottom: 1.7mm; }}
.num {{ display: inline-flex; align-items: center; justify-content: center; width: 3.6mm; height: 3.6mm;
        border: 0.7pt solid {INK}; border-radius: 50%; font-size: 6pt; font-weight: 600; line-height: 1; }}
.nt {{ font-weight: 600; font-size: 6.9pt; display: flex; align-items: center; gap: 1.6mm; }}
.nb {{ color: {INK2}; }}
svg.sw {{ flex: none; }}
ul.legend {{ list-style: none; margin: 0; padding: 0; }}
ul.legend li {{ display: grid; grid-template-columns: 9.5mm 1fr; align-items: center; margin-bottom: 1.1mm; color: {INK2}; }}

/* Beregning */
.ch {{ display: flex; justify-content: space-between; align-items: baseline; }}
.ct {{ font-size: 9pt; font-weight: 700; color: {STEEL}; }}
.cs {{ color: {INK2}; font-size: 6.2pt; }}
.dia {{ margin: 1mm 0 0.6mm; }}
table.t {{ width: 100%; border-collapse: collapse; margin-top: 1.2mm; }}
table.t th {{ font-size: 5.6pt; font-weight: 600; color: {MUTED}; text-align: right; padding: 0 0 0.6mm;
              border-bottom: 0.6pt solid {HAIR}; letter-spacing: 0.02em; }}
table.t th:first-child {{ text-align: left; text-transform: uppercase; letter-spacing: 0.07em; }}
table.t td {{ text-align: right; padding: 0.45mm 0; white-space: nowrap; }}
table.t td:first-child {{ text-align: left; }}
table.t td:nth-child(2), table.t th:nth-child(2) {{ width: 11mm; }}
table.t td:nth-child(3), table.t th:nth-child(3) {{ width: 11mm; }}
table.t td:nth-child(4), table.t th:nth-child(4) {{ width: 11mm; }}
table.t tr.sum td {{ border-top: 0.6pt solid {HAIR}; font-weight: 600; }}
table.k td:nth-child(4), table.k th:nth-child(4) {{ width: 25mm; }}
table.k td.u {{ display: flex; align-items: center; justify-content: flex-end; gap: 1.6mm; }}
table.k tr.sec td {{ color: {MUTED}; }}
.bar {{ display: inline-block; width: 13mm; height: 1.5mm; background: #e8ebef; border-radius: 1mm; overflow: hidden; }}
.bar i {{ display: block; height: 100%; background: {STEEL}; border-radius: 1mm; }}
.bar.light i {{ background: #9fb0c2; }}

ul.bl {{ margin: 0; padding: 0 0 0 2.6mm; color: {INK2}; }}
ul.bl li {{ margin-bottom: 0.7mm; }}
ul.bl li::marker {{ color: {MUTED}; }}
.check {{ margin-top: 3.4mm; padding: 1.6mm 0 0.2mm 2.6mm; border-left: 1.2pt solid {AMBER}; }}
.check .nt {{ color: {AMBER}; margin-bottom: 0.6mm; }}

/* Notater under snittet */
.nrow {{ position: absolute; left: 10mm; width: 189mm; top: 139mm; height: 44mm;
         display: grid; grid-template-columns: 44mm 44mm 1fr 27mm; column-gap: 5mm;
         border-top: 0.6pt solid {HAIR}; padding-top: 2.6mm; }}
.nc .nt {{ margin-bottom: 0.6mm; }}
.sn {{ display: grid; grid-template-columns: 5.4mm 1fr; }}
.kh {{ font-size: 5.6pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: {MUTED}; margin-bottom: 1mm; }}

/* Tegningshode */
.foot {{ position: absolute; left: 10mm; width: 277mm; top: {FOOT_TOP}mm; height: 14mm; display: grid;
         border-top: 1pt solid {INK}; }}
.fc {{ padding: 1.4mm 2.4mm 0 0; border-right: 0.6pt solid {HAIR}; margin-right: 2.4mm; }}
.fc:last-child {{ border-right: 0; margin-right: 0; }}
.fl {{ font-size: 5.2pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: {MUTED}; margin-bottom: 0.4mm; }}
.fv {{ font-size: 6.8pt; line-height: 1.3; }}
.fv .big {{ font-size: 8.4pt; font-weight: 700; }}
.sheetno .fv {{ display: flex; align-items: baseline; }}
.sheetno .no {{ font-size: 17pt; font-weight: 700; line-height: 1; }}
.sheetno .of {{ font-size: 8pt; color: {MUTED}; margin-left: 0.4mm; }}
"""


# Tekstmaskering: legger en flate bak tekst med data-halo (i stedet for strek
# rundt bokstavene, som Chromium må legge inn som Type 3-font i PDF-en).
HALO_JS = """
document.fonts.ready.then(() => {
  const NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('text[data-halo]').forEach((t) => {
    const pad = parseFloat(t.dataset.halo);
    const fs = parseFloat(t.getAttribute('font-size'));
    const y = parseFloat(t.getAttribute('y'));
    const b = t.getBBox();
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', b.x - pad);
    r.setAttribute('width', b.width + 2 * pad);
    r.setAttribute('y', y - 0.78 * fs - pad * 0.6);
    r.setAttribute('height', 1.0 * fs + pad * 1.2);
    r.setAttribute('fill', t.dataset.haloColor);
    if (t.hasAttribute('transform')) r.setAttribute('transform', t.getAttribute('transform'));
    t.parentNode.insertBefore(r, t);
  });
  window.__halo = true;
});
"""


def build() -> str:
    pages = [sheet1(), sheet2(), sheet3()]
    return (f'<!doctype html><html lang="no"><head><meta charset="utf-8">'
            f'<title>{esc(PROJECT)} – {esc(SUBJECT)} – rev. {REV}</title><style>{CSS}</style></head>'
            f'<body>{DEFS}{"".join(pages)}<script>{HALO_JS}</script></body></html>')


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "build")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "tegninger.html")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(build())
    print(path)
