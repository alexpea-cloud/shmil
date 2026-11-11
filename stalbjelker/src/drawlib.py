"""drawlib – lite tegnebibliotek for prinsipptegninger.

Alt tegnes som SVG der 1 brukerenhet = 1 mm på papiret (A3 liggende 420 x 297).
Modellkoordinater (meter) gjøres om til papir-mm med en View. PDF/PNG lages av
render.js (Chromium). Skrift: Inter (installert). Tekstbredder måles med PIL slik
at ombrekking og bokser blir riktige.

Hovedideer
----------
Sheet        ett ark: ramme, tittelfelt, revisjonstabell, lag for tegning.
View         avbildning modell (m) -> papir (mm) i en gitt målestokk.
Primitiver   line/poly/rect/circle/path/text i papir-mm, med navngitte stiler.
Byggesteiner dim (målsetting), leader (henvisning), notebox, table, scalebar,
             lastpiler, skravurer (betong, tegl, tre, stål, terreng).
"""
from __future__ import annotations

import html
import math
import os
from PIL import ImageFont

# --------------------------------------------------------------------------
# Skrift og tekstmåling
# --------------------------------------------------------------------------
FONT_DIR = "/usr/share/fonts/opentype/inter/"
FONT_FILES = {
    400: "Inter-Regular.otf",
    500: "Inter-Medium.otf",
    600: "Inter-SemiBold.otf",
    700: "Inter-Bold.otf",
}
FONT_FAMILY = "Inter, 'Liberation Sans', Arial, sans-serif"
_FONT_CACHE: dict = {}


def _font(weight: int = 400):
    weight = min(FONT_FILES, key=lambda w: abs(w - weight))
    if weight not in _FONT_CACHE:
        _FONT_CACHE[weight] = ImageFont.truetype(FONT_DIR + FONT_FILES[weight], 200)
    return _FONT_CACHE[weight]


def _plain(s: str) -> str:
    return str(s).replace("_{", "").replace("^{", "").replace("}", "").replace("**", "")


def text_w(s: str, size: float, weight: int = 400) -> float:
    """Bredde (mm) av teksten s i skriftstørrelse size (mm)."""
    return _font(weight).getlength(_plain(s)) / 200.0 * size


def wrap(s: str, size: float, max_w: float, weight: int = 400) -> list[str]:
    """Bryt teksten s i linjer som er høyst max_w mm brede."""
    out: list[str] = []
    for para in s.split("\n"):
        words = para.split(" ")
        cur = ""
        for w in words:
            trial = (cur + " " + w).strip()
            if cur and text_w(trial, size, weight) > max_w:
                out.append(cur)
                cur = w
            else:
                cur = trial
        out.append(cur)
    return out


def esc(s: str) -> str:
    return html.escape(str(s), quote=False)


def num(v: float, nd: int = 2) -> str:
    """Tall med norsk desimalkomma."""
    return f"{v:.{nd}f}".replace(".", ",")


# --------------------------------------------------------------------------
# Farger og stiler
# --------------------------------------------------------------------------
INK = "#1b2026"      # hovedstrek og tekst
INK2 = "#48525c"     # sekundær tekst
INK3 = "#5d6873"     # svak tekst / hjelpelinjer (kontrast ca. 5,8:1 mot hvitt)
PAPER = "#ffffff"
RULE = "#c4cad0"     # skillelinjer i tabeller/bokser

STEEL = "#1f4468"    # stål – strek
STEEL_F = "#c8d7e6"  # stål – fyll
STEEL_D = "#2e4a62"  # stål i plan (massiv)
TIMBER = "#8a6734"   # tre – strek
TIMBER_F = "#f5e8cf"  # tre – fyll
TIMBER_F2 = "#ecd9b3"  # tre – mørkere fyll (2018-deler)
CONC = "#60666c"     # betong – strek
CONC_F = "#e9e9e6"   # betong – fyll
BRICK = "#a5553c"    # tegl – strek
BRICK_F = "#f6dfd5"  # tegl – fyll
WALL_F = "#d6dade"   # vegg i plan – fyll
WALL = "#59626b"     # vegg i plan – strek
RED = "#c62828"      # fjernet 2018
BLUE = "#2468a8"     # terrasse / snø
BLUE_F = "#dce9f6"
GREEN = "#2e7d4f"    # OK-markering
AMBER = "#b26a00"    # forbehold-markering
ABOVE = "#5a3d8a"    # konstruksjon over (2. etasje)

# navngitte strekstiler: (farge, bredde mm, stiplemønster)
STYLES = {
    "cut": (INK, 0.50, None),         # snittet kontur
    "cut2": (INK, 0.35, None),
    "vis": (INK, 0.25, None),         # synlig kant
    "thin": (INK2, 0.13, None),       # tynn strek
    "hair": (INK3, 0.09, None),
    "hid": (INK2, 0.20, "1.6 1.0"),   # skjult / under gulv
    "above": (ABOVE, 0.25, "5 1.1 0.7 1.1"),  # over snittplanet (2. etasje)
    "center": (INK2, 0.13, "6 1.2 0.8 1.2"),
    "removed": (RED, 0.30, "1.8 1.0"),
    "dim": (INK, 0.13, None),
    "leader": (INK3, 0.13, None),
    "steel": (STEEL, 0.50, None),
    "timber": (TIMBER, 0.25, None),
    "timber_cut": (TIMBER, 0.40, None),
    "conc": (CONC, 0.35, None),
    "brick": (BRICK, 0.35, None),
    "blue": (BLUE, 0.25, None),
    "blue_dash": (BLUE, 0.25, "2.2 1.2"),
    "frame": (INK, 0.50, None),
    "rule": (RULE, 0.15, None),
}

# tekststørrelser (mm skrifthøyde, font-size)
T_XS = 2.47         # 7,0 pt – minste skrift på arket
T_S = 2.72
T_M = 2.88
T_L = 3.3
T_XL = 4.4
T_XXL = 5.6


def _style(style, **over):
    if isinstance(style, str):
        col, w, dash = STYLES[style]
    else:
        col, w, dash = style
    col = over.get("stroke", col)
    w = over.get("sw", w)
    dash = over.get("dash", dash)
    s = f'stroke="{col}" stroke-width="{w}"'
    if dash:
        s += f' stroke-dasharray="{dash}"'
    return s


# --------------------------------------------------------------------------
# Ark
# --------------------------------------------------------------------------
class Sheet:
    """Ett A3-ark (liggende). Alle koordinater i mm fra øvre venstre hjørne."""

    W = 420.0
    H = 297.0
    M_L, M_R, M_T, M_B = 15.0, 10.0, 10.0, 10.0   # rammemarger

    def __init__(self):
        self.parts: list[str] = []
        self.defs: list[str] = [HATCH_DEFS]
        self.boxes: list[tuple] = []          # (x0, y0, x1, y1, tekst) for hver tekst – til overlappkontroll
        # indre ramme
        self.x0, self.y0 = self.M_L, self.M_T
        self.x1, self.y1 = self.W - self.M_R, self.H - self.M_B

    # ---- lavnivå -----------------------------------------------------
    def add(self, s: str):
        self.parts.append(s)

    def line(self, x1, y1, x2, y2, style="vis", cap="butt", **over):
        self.add(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" '
                 f'{_style(style, **over)} stroke-linecap="{cap}" fill="none"/>')

    def poly(self, pts, style="vis", fill="none", close=False, join="miter", opacity=None, **over):
        d = " ".join(f"{x:.3f},{y:.3f}" for x, y in pts)
        tag = "polygon" if close else "polyline"
        op = f' fill-opacity="{opacity}"' if opacity is not None else ""
        st = _style(style, **over) if style else 'stroke="none"'
        self.add(f'<{tag} points="{d}" {st} fill="{fill}"{op} stroke-linejoin="{join}"/>')

    def rect(self, x, y, w, h, style="vis", fill="none", rx=0, opacity=None, **over):
        if w < 0:
            x, w = x + w, -w
        if h < 0:
            y, h = y + h, -h
        op = f' fill-opacity="{opacity}"' if opacity is not None else ""
        st = _style(style, **over) if style else 'stroke="none"'
        self.add(f'<rect x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{h:.3f}" rx="{rx}" '
                 f'{st} fill="{fill}"{op}/>')

    def circle(self, x, y, r, style="vis", fill="none", **over):
        st = _style(style, **over) if style else 'stroke="none"'
        self.add(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{r:.3f}" {st} fill="{fill}"/>')

    def path(self, d, style="vis", fill="none", **over):
        st = _style(style, **over) if style else 'stroke="none"'
        self.add(f'<path d="{d}" {st} fill="{fill}" stroke-linejoin="round"/>')

    def text(self, x, y, s, size=T_M, weight=400, fill=INK, anchor="start", rot=0,
             italic=False, halo=False, baseline=None, spacing=None):
        """Tekst med grunnlinje i (x, y). anchor: start|middle|end. rot i grader (mot klokka positiv).
        halo: hvit bakgrunnsboks bak teksten (True eller polstring i mm)."""
        tr = f' transform="rotate({-rot:.2f} {x:.3f} {y:.3f})"' if rot else ""
        it = ' font-style="italic"' if italic else ""
        if s and rot in (0, 90):
            tw_ = text_w(s, size, weight)
            a0 = 0.0 if anchor == "start" else (-tw_ / 2 if anchor == "middle" else -tw_)
            if rot == 0:
                self.boxes.append((x + a0, y - size * 0.74, x + a0 + tw_, y + size * 0.22, s))
            else:       # leses nedenfra og opp
                self.boxes.append((x - size * 0.74, y - a0 - tw_, x + size * 0.22, y - a0, s))
        bl = f' dominant-baseline="{baseline}"' if baseline else ""
        ls = f' letter-spacing="{spacing}"' if spacing else ""
        if halo:
            pad = 0.45 if halo is True else min(0.9, float(halo) * 0.45)
            w = text_w(s, size, weight)
            x0 = x if anchor == "start" else (x - w / 2 if anchor == "middle" else x - w)
            self.add(f'<rect x="{x0 - pad:.3f}" y="{y - size * 0.80:.3f}" width="{w + 2 * pad:.3f}" '
                     f'height="{size * 1.06:.3f}" fill="{PAPER}" fill-opacity="0.88"{tr}/>')
        self.add(f'<text x="{x:.3f}" y="{y:.3f}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
                 f'text-anchor="{anchor}"{tr}{it}{bl}{ls}>{rich(s)}</text>')

    def mtext(self, x, y, lines, size=T_M, weight=400, fill=INK, anchor="start", lh=1.32, **kw):
        """Flere linjer; y er grunnlinjen til første linje. Returnerer y for neste linje."""
        for i, ln in enumerate(lines):
            self.text(x, y + i * size * lh, ln, size=size, weight=weight, fill=fill, anchor=anchor, **kw)
        return y + len(lines) * size * lh

    # ---- ramme, tittelfelt ---------------------------------------------
    def frame(self, attachment=None):
        self.rect(self.x0, self.y0, self.x1 - self.x0, self.y1 - self.y0, "frame")
        if attachment:      # vedleggsnummer i saken, øverst til høyre
            self.text(self.x1 - 2.5, self.y0 + 4.9, f"Vedlegg {attachment}", size=T_S, weight=600, fill=INK2, anchor="end")

    def titleblock(self, *, title, subtitle, drawing_no, sheet_no, scale, rev, date,
                   status="PRINSIPPSKISSE, SOM UTFØRT 2018 – IKKE KONTROLLERT AV FORETAK", w=178.0, project="[eiendom]",
                   owner="[tiltakshaver]", case="[saksnummer]"):
        """Tittelfelt nederst til høyre. Returnerer (x, y, w, h) for feltet."""
        h = 40.0
        x = self.x1 - w
        y = self.y1 - h
        self.rect(x, y, w, h, "cut2", fill=PAPER)
        # rader
        r1, r2, r3 = y + 9.0, y + 23.0, y + 31.5
        for ry in (r1, r2, r3):
            self.line(x, ry, x + w, ry, "thin")

        def cell(cx, cy, label, value, vsize=T_M, vweight=600, cw=None):
            self.text(cx + 1.6, cy + 2.9, label, size=2.0, fill=INK3, weight=500, spacing="0.05")
            if cw:      # krymp verdien om den ikke får plass i feltet
                vsize = min(vsize, vsize * (cw - 3.2) / max(1e-6, text_w(value, vsize, vweight)))
            self.text(cx + 1.6, cy + 2.9 + vsize * 1.18 + 0.4, value, size=vsize, weight=vweight)

        # rad 1: prosjekt | tiltakshaver
        c1, c1b = x + w * 0.56, x + w * 0.80
        self.line(c1, y, c1, r1, "thin")
        self.line(c1b, y, c1b, r1, "thin")
        cell(x, y, "PROSJEKT / EIENDOM", project, vsize=T_S, cw=w * 0.56)
        cell(c1, y, "TILTAKSHAVER", owner, vsize=T_S, cw=w * 0.24)
        cell(c1b, y, "KOMMUNENS SAKSNR.", case, vsize=T_S, cw=w * 0.20)
        # rad 2: tittel
        self.text(x + 1.6, r1 + 2.9, "TEGNING", size=2.0, fill=INK3, weight=500, spacing="0.05")
        self.text(x + 1.6, r1 + 8.6, title, size=T_XL, weight=700)
        self.text(x + 1.6, r1 + 12.6, subtitle, size=T_S, fill=INK2)
        # rad 3: målestokk | format | dato | rev | tegn.nr | ark
        cols = [("MÅLESTOKK", scale, 0.17), ("FORMAT", "A3 – skrives ut i A3", 0.23), ("DATO", date, 0.16),
                ("REV.", rev, 0.08), ("TEGN.NR.", drawing_no, 0.16), ("ARK", sheet_no, 0.20)]
        cx = x
        for i, (lab, val, frac) in enumerate(cols):
            cw = w * frac
            if i:
                self.line(cx, r2, cx, r3, "thin")
            cell(cx, r2, lab, val, vsize=T_M, vweight=700, cw=cw)
            cx += cw
        # rad 4: status | utarbeidet | gjennomgått
        c2, c3 = x + w * 0.52, x + w * 0.72
        self.line(c2, r3, c2, y + h, "thin")
        self.line(c3, r3, c3, y + h, "thin")
        cell(x, r3, "STATUS", status, vsize=T_XS, vweight=700, cw=w * 0.52)
        cell(c2, r3, "UTARBEIDET AV", "Tiltakshaver", vsize=T_XS, vweight=500, cw=w * 0.20)
        cell(c3, r3, "GJENNOMGÅTT AV (dato/sign.)", "", vsize=T_XS)
        return x, y, w, h

    def revtable(self, x, y_bottom, w, rows):
        """Revisjonstabell som vokser oppover fra y_bottom. rows: [(rev, dato, tekst)], nyeste først.
        Returnerer y for toppen."""
        size = T_XS
        lh = size * 1.32
        cw = (9.0, 19.0)
        tw = w - cw[0] - cw[1] - 3.0
        blocks = []
        for rev, date, txt in rows:
            lines = wrap(txt, size, tw)
            blocks.append((rev, date, lines))
        head_h = 5.0
        total = head_h + sum(len(b[2]) * lh + 2.2 for b in blocks)
        y = y_bottom - total
        self.rect(x, y, w, total, "cut2", fill=PAPER)
        self.text(x + 1.6, y + 3.4, "REV.", size=2.0, fill=INK3, weight=500, spacing="0.05")
        self.text(x + cw[0] + 1.6, y + 3.4, "DATO", size=2.0, fill=INK3, weight=500, spacing="0.05")
        self.text(x + cw[0] + cw[1] + 1.6, y + 3.4, "ENDRING", size=2.0, fill=INK3, weight=500, spacing="0.05")
        yy = y + head_h
        for rev, date, lines in blocks:
            self.line(x, yy, x + w, yy, "thin")
            self.text(x + 1.6, yy + 3.3, rev, size=size, weight=700)
            self.text(x + cw[0] + 1.6, yy + 3.3, date, size=size)
            self.mtext(x + cw[0] + cw[1] + 1.6, yy + 3.3, lines, size=size)
            yy += len(lines) * lh + 2.2
        self.line(x + cw[0], y, x + cw[0], y_bottom, "thin")
        self.line(x + cw[0] + cw[1], y, x + cw[0] + cw[1], y_bottom, "thin")
        return y

    # ---- overskrift for delfigur ----------------------------------------
    def figtitle(self, x, y, title, scale=None, note=None):
        """Figurtittel: fet tittel, målestokk og ev. merknad, med strek under."""
        self.text(x, y, title, size=T_XL, weight=700)
        tw = text_w(title, T_XL, 700)
        xx = x + tw + 4
        if scale:
            self.text(xx, y, scale, size=T_L, fill=INK2, weight=500)
            xx += text_w(scale, T_L, 500) + 4
        if note:
            self.text(xx, y, note, size=T_S, fill=INK3)
        self.line(x, y + 1.6, x + tw, y + 1.6, "cut2")

    # ---- målsetting ----------------------------------------------------
    def dim(self, p1, p2, off, label, *, side=1, size=T_M, weight=500, ext=True, color=INK,
            text_off=0.9, gap=1.0, text_shift=0.0, halo=True, nts=False):
        """Mållinje mellom papirpunktene p1 og p2, forskjøvet off mm vinkelrett (fortegn gir side).

        Mållinja tegnes parallelt med p1–p2. Skrå målstreker, hjelpelinjer fra punktene, tekst
        sentrert over linja (for loddrette linjer leses teksten nedenfra og opp).
        """
        (x1, y1), (x2, y2) = p1, p2
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        if L == 0:
            return
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux                      # normal
        ax, ay = x1 + nx * off, y1 + ny * off
        bx, by = x2 + nx * off, y2 + ny * off
        st = ("dim" if color == INK else (color, 0.13, None))
        self.line(ax - ux * 1.2, ay - uy * 1.2, bx + ux * 1.2, by + uy * 1.2, st)
        if ext:
            sgn = 1 if off >= 0 else -1
            for (px, py), (qx, qy) in (((x1, y1), (ax, ay)), ((x2, y2), (bx, by))):
                self.line(px + nx * gap * sgn, py + ny * gap * sgn, qx + nx * 1.2 * sgn, qy + ny * 1.2 * sgn, st)
        # skrå målstreker (45°)
        for (qx, qy) in ((ax, ay), (bx, by)):
            tx, ty = (ux + nx) * 0.9, (uy + ny) * 0.9
            self.line(qx - tx, qy - ty, qx + tx, qy + ty, (color, 0.32, None))
        # tekst
        mx, my = (ax + bx) / 2 + ux * text_shift, (ay + by) / 2 + uy * text_shift
        ang = math.degrees(math.atan2(-dy, dx))    # skjermvinkel, mot klokka positiv
        if ang > 90 or ang <= -90:                 # hold teksten lesbar
            ang += 180 if ang < 0 else -180
        # tekst plasseres på "oversiden" av linja i lese-retningen
        a = math.radians(ang)
        ox, oy = -math.sin(a), -math.cos(a)        # enhetsvektor "opp" i tekstens system (skjerm)
        tx, ty = mx + ox * text_off * side, my + oy * text_off * side
        self.text(tx, ty, label, size=size, weight=weight, fill=color, anchor="middle", rot=ang, halo=halo)
        if nts:   # understreket mål = påskrevet mål gjelder, tegnet lengde avviker
            w = text_w(label, size, weight) / 2
            ca, sa = math.cos(a), -math.sin(a)
            ux2, uy2 = ca, sa
            bx_, by_ = tx - ox * 0.55, ty - oy * 0.55
            self.line(bx_ - ux2 * w, by_ - uy2 * w, bx_ + ux2 * w, by_ + uy2 * w, (color, 0.22, None))

    # ---- henvisning ----------------------------------------------------
    def leader(self, anchor, pos, title, lines=(), *, align="left", size=T_S, tsize=T_M, width=None,
               color=INK, dot=True, elbow=None, title_weight=700, line_fill=INK2):
        """Henvisning: liten prikk i anchor, tynn strek til tekstblokk i pos.

        pos er øvre venstre (align=left) eller øvre høyre (align=right) hjørne av tekstblokken.
        lines kan være en streng (brytes til width) eller liste av linjer.
        Returnerer y under tekstblokken.
        """
        ax, ay = anchor
        px, py = pos
        if isinstance(lines, str):
            lines = wrap(lines, size, width or 60)
        anchor_txt = "start" if align == "left" else "end"
        ty = py + tsize * 0.95
        self.text(px, ty, title, size=tsize, weight=title_weight, fill=color, anchor=anchor_txt)
        y_end = ty
        if lines:
            y_end = self.mtext(px, ty + size * 1.4, list(lines), size=size, fill=line_fill, anchor=anchor_txt) - size * 1.32
        # strek: fra tekstblokkens kant (på høyde med tittelen) til anchor
        ex = px - 1.5 if align == "left" else px + 1.5
        ey = ty - tsize * 0.33
        st = "leader" if color == INK else (color, 0.13, None)
        if elbow is not None:
            self.poly([(ex, ey), (elbow, ey), (ax, ay)], st)
        else:
            self.line(ex, ey, ax, ay, st)
        if dot:
            self.circle(ax, ay, 0.42, None, fill=(INK2 if color == INK else color))
        return y_end + size * 0.6


    def callout(self, n, anchor, pos, *, color=INK, r=1.95, size=2.2):
        """Nummerert henvisning: liten strek fra anchor til sirkel med nummer i pos (papir-mm)."""
        ax, ay = anchor
        px, py = pos
        d = math.hypot(ax - px, ay - py)
        if d > r:
            ux, uy = (ax - px) / d, (ay - py) / d
            self.line(px + ux * r, py + uy * r, ax, ay, (color, 0.2, None))
            self.circle(ax, ay, 0.45, None, fill=color)
        self.circle(px, py, r, (PAPER, 0.3, None), fill=color)
        self.text(px, py + size * 0.36, str(n), size=size, weight=700, fill=PAPER, anchor="middle")

    def callout_list(self, x, y, w, items, *, size=T_XS, tsize=T_S, gap=2.6, r=1.95):
        """Liste med nummererte henvisninger. items: [(n, tittel, tekst, farge)]. Returnerer y under lista."""
        yy = y
        for n, title, body, color in items:
            self.circle(x + r, yy + r, r, None, fill=color)
            self.text(x + r, yy + r + 2.2 * 0.36, str(n), size=2.2, weight=700, fill=PAPER, anchor="middle")
            self.text(x + 2 * r + 2.0, yy + tsize * 0.95, title, size=tsize, weight=700, fill=color)
            lines = wrap(body, size, w - 2 * r - 2.0)
            y2 = self.mtext(x + 2 * r + 2.0, yy + tsize * 0.95 + size * 1.4, lines, size=size, fill=INK2)
            yy = y2 - size * 1.32 + size * 0.5 + gap
        return yy

    # ---- bokser, tabeller ----------------------------------------------
    def notebox(self, x, y, w, title, items, *, size=T_S, bullet=True, pad=2.6, accent=None, tsize=T_M,
                fill=PAPER, lh=1.34, gap=0.9):
        """Boks med tittel og punktliste (items: liste av strenger; brytes automatisk).
        Returnerer y under boksen."""
        inner = w - 2 * pad - (2.6 if bullet else 0)
        lines_all = []
        for it in items:
            lines_all.append(wrap(it, size, inner))
        h = pad + tsize * 1.25 + 1.2 + sum(len(l) * size * lh + gap for l in lines_all) + pad - gap
        self.rect(x, y, w, h, (RULE, 0.25, None), fill=fill, rx=1.2)
        if accent:
            self.rect(x, y, 1.1, h, None, fill=accent)
        yy = y + pad + tsize * 0.95
        self.text(x + pad, yy, title, size=tsize, weight=700)
        yy += tsize * 0.3 + 1.2 + size
        for ls in lines_all:
            if bullet:
                self.circle(x + pad + 0.8, yy - size * 0.33, 0.38, None, fill=INK3)
            self.mtext(x + pad + (2.6 if bullet else 0), yy, ls, size=size, fill=INK2, lh=lh)
            yy += len(ls) * size * lh + gap
        return y + h

    def table(self, x, y, colw, rows, *, size=T_S, row_h=None, head=True, align=None, bold_last=False,
              zebra=False, weights=None, fills=None):
        """Enkel tabell. colw: kolonnebredder (mm). rows: liste av lister med strenger.
        align: liste 'l'/'r'/'c' per kolonne. Returnerer y under tabellen."""
        row_h = row_h or size * 1.75
        align = align or ["l"] + ["r"] * (len(colw) - 1)
        w = sum(colw)
        yy = y
        for ri, row in enumerate(rows):
            is_head = head and ri == 0
            if zebra and not is_head and ri % 2 == 0:
                self.rect(x, yy, w, row_h, None, fill="#f3f5f7")
            cx = x
            for ci, cell in enumerate(row):
                a = align[ci]
                tx = cx + 1.2 if a == "l" else (cx + colw[ci] - 1.2 if a == "r" else cx + colw[ci] / 2)
                anc = {"l": "start", "r": "end", "c": "middle"}[a]
                wt = 600 if is_head else 400
                fl = INK3 if is_head else INK
                sz = size * 0.86 if is_head else size
                if weights and not is_head and weights[ri][ci]:
                    wt = weights[ri][ci]
                if fills and not is_head and fills[ri][ci]:
                    fl = fills[ri][ci]
                if bold_last and ri == len(rows) - 1:
                    wt = 700
                self.text(tx, yy + row_h * 0.68, cell, size=sz, weight=wt, fill=fl, anchor=anc)
                cx += colw[ci]
            yy += row_h
            self.line(x, yy, x + w, yy, "rule" if not is_head else (INK2, 0.2, None))
        return yy

    def utilbar(self, x, y, w, frac, *, h=1.6, color=STEEL_D):
        """Liten utnyttelsesstolpe (0–1)."""
        self.rect(x, y, w, h, None, fill="#e3e7eb", rx=0.5)
        self.rect(x, y, max(0.0, min(1.0, frac)) * w, h, None, fill=color, rx=0.5)

    def scalebar(self, x, y, mm_per_m, meters=(0, 1, 2), sub=0.5, label="m"):
        """Målestokklinjal. mm_per_m = papir-mm per meter."""
        total = meters[-1] * mm_per_m
        n = int(round(meters[-1] / sub))
        for i in range(n):
            self.rect(x + i * sub * mm_per_m, y, sub * mm_per_m, 1.1, (INK, 0.15, None),
                      fill=(INK if i % 2 == 0 else PAPER))
        for m in meters:
            self.text(x + m * mm_per_m, y + 4.0, num(m, 0) if float(m).is_integer() else num(m, 1),
                      size=T_XS, fill=INK2, anchor="middle")
        self.text(x + total + 2.2, y + 4.0, label, size=T_XS, fill=INK2)

    # ---- laster --------------------------------------------------------
    def udl(self, x1, x2, y_top, y_bot, *, n=None, color=INK, label=None, size=T_S, lw=0.22, label_dy=-1.2,
            weight=500):
        """Jevnt fordelt last: topplinje i y_top og piler ned til y_bot mellom x1 og x2 (papir-mm)."""
        n = n or max(2, int(round(abs(x2 - x1) / 7.0)) + 1)
        self.line(x1, y_top, x2, y_top, (color, lw, None))
        for i in range(n):
            x = x1 + (x2 - x1) * i / (n - 1)
            self.arrow(x, y_top, x, y_bot, color=color, lw=lw, head=1.3)
        if label:
            self.text((x1 + x2) / 2, y_top + label_dy, label, size=size, fill=color, anchor="middle", weight=weight)

    def arrow(self, x1, y1, x2, y2, *, color=INK, lw=0.25, head=1.8, both=False):
        """Pil fra (x1,y1) til (x2,y2) med fylt hode i (x2,y2)."""
        ang = math.atan2(y2 - y1, x2 - x1)
        self.line(x1, y1, x2 - math.cos(ang) * head * 0.8, y2 - math.sin(ang) * head * 0.8, (color, lw, None))

        def headpts(x, y, a):
            return [(x, y),
                    (x - head * math.cos(a - 0.30), y - head * math.sin(a - 0.30)),
                    (x - head * math.cos(a + 0.30), y - head * math.sin(a + 0.30))]
        self.poly(headpts(x2, y2, ang), None, fill=color, close=True)
        if both:
            self.poly(headpts(x1, y1, ang + math.pi), None, fill=color, close=True)

    def pload(self, x, y_top, y_bot, label=None, *, color=INK, size=T_S, lw=0.4, weight=600, anchor="middle",
              label_dx=0.0):
        """Punktlast: kraftig pil fra y_top ned til y_bot i x."""
        self.arrow(x, y_top, x, y_bot, color=color, lw=lw, head=2.2)
        if label:
            self.text(x + label_dx, y_top - 1.2, label, size=size, fill=color, anchor=anchor, weight=weight)

    # ---- materialer (papir-mm) -------------------------------------------
    def steel_rect(self, x, y, w, h, *, label=None, size=T_M):
        self.rect(x, y, w, h, "steel", fill=STEEL_F)
        if label:
            self.text(x + w / 2, y + h / 2 + size * 0.35, label, size=size, weight=700, fill=STEEL, anchor="middle")

    def ibeam_side(self, x, y, w, h, tf, *, label=None, size=T_M, fill=STEEL_F):
        """I-bjelke sett fra siden: kontur + flenslinjer. (x, y) øvre venstre, h total høyde, tf flenstykkelse (mm papir)."""
        self.rect(x, y, w, h, "steel", fill=fill)
        self.line(x, y + tf, x + w, y + tf, (STEEL, 0.18, None))
        self.line(x, y + h - tf, x + w, y + h - tf, (STEEL, 0.18, None))
        if label:
            self.text(x + w / 2, y + h / 2 + size * 0.35, label, size=size, weight=700, fill=STEEL, anchor="middle",
                      halo=0.6)

    def ibeam_section(self, cx, y_top, h, b, tw, tf, *, fill=STEEL_F, style="steel", r=0.0):
        """I-profil i tverrsnitt (snittet). cx = senter, y_top = overkant; mål i papir-mm."""
        x0, x1 = cx - b / 2, cx + b / 2
        w0, w1 = cx - tw / 2, cx + tw / 2
        pts = [(x0, y_top), (x1, y_top), (x1, y_top + tf), (w1, y_top + tf), (w1, y_top + h - tf),
               (x1, y_top + h - tf), (x1, y_top + h), (x0, y_top + h), (x0, y_top + h - tf),
               (w0, y_top + h - tf), (w0, y_top + tf), (x0, y_top + tf)]
        self.poly(pts, style, fill=fill, close=True)

    def timber_section(self, x, y, w, h, *, new=False, style="timber_cut"):
        """Tre i tverrsnitt (snittet endeved): rektangel med kryss."""
        self.rect(x, y, w, h, style, fill=(TIMBER_F2 if new else TIMBER_F))
        self.line(x, y, x + w, y + h, (TIMBER, 0.13, None))
        self.line(x + w, y, x, y + h, (TIMBER, 0.13, None))

    def timber_side(self, x, y, w, h, *, grain="h", new=False, style="timber", n=None):
        """Tre sett fra siden: lys fyll med fiberlinjer (grain 'h' vannrett / 'v' loddrett)."""
        self.rect(x, y, w, h, style, fill=(TIMBER_F2 if new else TIMBER_F))
        if grain == "v":
            n = n or max(1, int(abs(w) / 1.3))
            for i in range(1, n + 1):
                xx = x + w * i / (n + 1)
                self.line(xx, y + 0.4, xx, y + h - 0.4, (TIMBER, 0.07, None))
        elif grain == "h":
            n = n or max(1, int(abs(h) / 1.3))
            for i in range(1, n + 1):
                yy = y + h * i / (n + 1)
                self.line(x + 0.4, yy, x + w - 0.4, yy, (TIMBER, 0.07, None))

    def hatch(self, x, y, w, h, *, spacing=2.2, angle=45, color=INK3, sw=0.12, opacity=None):
        """Skråskravur med ekte vektorlinjer, klippet analytisk mot rektanglet."""
        if w < 0:
            x, w = x + w, -w
        if h < 0:
            y, h = y + h, -h
        t = math.tan(math.radians(angle))
        segs = []
        # linjer y = y0 - t*(X - x) + c ; for 45°: X + Y = konst
        if abs(angle - 45) < 1e-6 or abs(angle + 45) < 1e-6:
            sgn = 1 if angle > 0 else -1
            d = spacing * math.sqrt(2)
            n = int((w + h) / d) + 2
            for i in range(n):
                c = i * d
                if sgn > 0:      # stiger mot høyre: punkter (x + c - k, y + k)
                    x1, y1 = x + c, y
                    x2, y2 = x + c - h, y + h
                    if x1 > x + w:
                        y1 += x1 - (x + w); x1 = x + w
                    if x2 < x:
                        y2 -= x - x2; x2 = x
                else:            # faller mot høyre
                    x1, y1 = x + w - c, y
                    x2, y2 = x + w - c + h, y + h
                    if x1 < x:
                        y1 += x - x1; x1 = x
                    if x2 > x + w:
                        y2 -= x2 - (x + w); x2 = x + w
                if y1 < y2 - 1e-6 and y1 <= y + h and y2 >= y:
                    segs.append(f"M{x1:.2f} {y1:.2f}L{x2:.2f} {y2:.2f}")
        op = f' stroke-opacity="{opacity}"' if opacity is not None else ""
        if segs:
            self.add(f'<path d="{"".join(segs)}" stroke="{color}" stroke-width="{sw}" fill="none"{op}/>')

    def stipple(self, x, y, w, h, *, color=CONC, step=3.3):
        """Betongsignatur: små trekanter og prikker på forskjøvet rutenett (vektor, deterministisk)."""
        if w < 0:
            x, w = x + w, -w
        if h < 0:
            y, h = y + h, -h
        tri, dots = [], []
        ny = max(1, int(h / step))
        nx = max(1, int(w / step))
        for j in range(ny + 1):
            for i in range(nx + 1):
                px = x + (i + 0.5 + (0.5 if j % 2 else 0)) * step
                py = y + (j + 0.5) * step
                k = (i * 7 + j * 13) % 5
                jx = ((i * 37 + j * 17) % 11 - 5) * 0.14
                jy = ((i * 23 + j * 29) % 11 - 5) * 0.14
                px, py = px + jx, py + jy
                if px < x + 0.9 or px > x + w - 0.9 or py < y + 0.9 or py > y + h - 0.9:
                    continue
                if k in (0, 2):
                    r = 0.75 if k == 0 else 0.5
                    tri.append(f"M{px - r:.2f} {py + r * 0.6:.2f}L{px:.2f} {py - r * 0.9:.2f}L{px + r:.2f} {py + r * 0.6:.2f}Z")
                else:
                    dots.append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="0.15"/>')
        if tri:
            self.add(f'<path d="{"".join(tri)}" stroke="{color}" stroke-width="0.11" fill="none"/>')
        if dots:
            self.add(f'<g fill="{color}">{"".join(dots)}</g>')

    def dots_poly(self, pts, *, color=BLUE, step=1.5, r=0.17):
        """Prikker (snø) på forskjøvet rutenett innenfor polygonet pts (papir-mm)."""
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]

        def inside(px, py):
            c = False
            n = len(pts)
            for i in range(n):
                x1, y1 = pts[i]
                x2, y2 = pts[(i + 1) % n]
                if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                    c = not c
            return c
        out = []
        j = 0
        yy = min(ys) + step / 2
        while yy < max(ys):
            xx = min(xs) + step / 2 + (step / 2 if j % 2 else 0)
            while xx < max(xs):
                if inside(xx, yy):
                    out.append(f'<circle cx="{xx:.2f}" cy="{yy:.2f}" r="{r}"/>')
                xx += step
            yy += step
            j += 1
        if out:
            self.add(f'<g fill="{color}">{"".join(out)}</g>')

    def concrete(self, x, y, w, h, *, style="conc"):
        self.rect(x, y, w, h, None, fill=CONC_F)
        self.stipple(x, y, w, h)
        self.rect(x, y, w, h, style)

    def brick(self, x, y, w, h, *, style="brick"):
        self.rect(x, y, w, h, None, fill=BRICK_F)
        self.hatch(x, y, w, h, spacing=1.6, angle=45, color=BRICK, sw=0.14)
        self.rect(x, y, w, h, style)

    def brick_elev(self, x, y, w, h, *, course=3.75):
        """Murverk sett i oppriss (ikke snittet): lys fyll med vannrette skift og forskjøvne stussfuger."""
        if h < 0:
            y, h = y + h, -h
        self.rect(x, y, w, h, None, fill="#fbefe9")
        n = int(h / course)
        for i in range(1, n + 1):
            yy = y + h - i * course
            if yy > y + 0.3:
                self.line(x, yy, x + w, yy, (BRICK, 0.08, None))
            x_off = (0.25 if i % 2 else 0.75) * w
            self.line(x + x_off, yy, x + x_off, min(y + h, yy + course), (BRICK, 0.08, None))
        self.rect(x, y, w, h, (BRICK, 0.25, None))

    def legend_row(self, x, y, items, *, size=T_XS, gap=5.0, sw=6.0):
        """Vannrett tegnforklaring. items: [(type, tekst)], type = steel | timber | timber_new | conc | brick |
        removed | load | react | unknown. Returnerer x etter siste element."""
        for kind, label in items:
            yy = y - 2.0
            if kind == "steel":
                self.rect(x, yy, sw, 2.4, "steel", fill=STEEL_F, sw=0.35)
            elif kind == "timber":
                self.rect(x, yy, sw, 2.4, "timber", fill=TIMBER_F)
            elif kind == "timber_new":
                self.rect(x, yy, sw, 2.4, "timber", fill=TIMBER_F2)
            elif kind == "conc":
                self.rect(x, yy, sw, 2.4, None, fill=CONC_F)
                self.stipple(x, yy, sw, 2.4)
                self.rect(x, yy, sw, 2.4, "conc", sw=0.25)
            elif kind == "brick":
                self.brick_elev(x, yy, sw, 2.4, course=1.2)
            elif kind == "removed":
                self.rect(x, yy, sw, 2.4, "removed", fill="#fdf1f0", sw=0.25)
            elif kind == "unknown":
                self.rect(x, yy, sw, 2.4, (INK2, 0.25, "1.2 0.8"), fill="none")
            elif kind == "load":
                self.arrow(x + sw / 2, yy - 0.6, x + sw / 2, yy + 2.6, color=INK, lw=0.3, head=1.5)
            elif kind == "react":
                self.arrow(x + sw / 2, yy - 0.6, x + sw / 2, yy + 2.6, color=RED, lw=0.4, head=1.7)
            self.text(x + sw + 1.4, y, label, size=size, fill=INK2)
            x += sw + 1.4 + text_w(label, size) + gap
        return x

    def loadfield(self, x, y, w, h, *, blue=False):
        """Lastfelt i plan: lys fyll med tynn skråskravur."""
        if blue:
            self.rect(x, y, w, h, None, fill=BLUE_F, opacity=0.75)
            self.hatch(x, y, w, h, spacing=1.7, angle=-45, color=BLUE, sw=0.1, opacity=0.5)
        else:
            self.rect(x, y, w, h, None, fill="#eef2f6")
            self.hatch(x, y, w, h, spacing=1.7, angle=45, color=STEEL_D, sw=0.1, opacity=0.5)

    def logwall(self, x, y, w, h, *, n=None, style="timber_cut"):
        """Tømmervegg i snitt: stokker som liggende rektangler."""
        n = n or max(1, int(round(abs(h) / 7.0)))
        self.rect(x, y, w, h, None, fill=TIMBER_F)
        for i in range(n):
            yy = y + h * i / n
            self.rect(x, yy, w, h / n, (TIMBER, 0.18, None), fill="none", rx=min(1.2, abs(w) / 4))
        self.rect(x, y, w, h, style)

    def ground(self, x1, x2, y, *, depth=2.2):
        """Terrenglinje med skråskravur under."""
        self.line(x1, y, x2, y, (INK, 0.35, None))
        step = 2.4
        xx = x1
        while xx < x2 - 0.5:
            self.line(xx + depth, y, xx, y + depth, (INK3, 0.1, None))
            xx += step

    def breakline(self, x1, y1, x2, y2, *, style="thin"):
        """Bruddlinje (sikksakk) mellom to punkter."""
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        z = 1.4
        pts = [(x1, y1), (mx - ux * z, my - uy * z), (mx - ux * z * 0.3 + nx * z, my - uy * z * 0.3 + ny * z),
               (mx + ux * z * 0.3 - nx * z, my + uy * z * 0.3 - ny * z), (mx + ux * z, my + uy * z), (x2, y2)]
        self.poly(pts, style)

    def section_mark(self, x, y, letter, direction, *, size=T_L, length=7.0):
        """Snittmarkering: kraftig strek med pil i synsretning og bokstav.
        direction: 'left'/'right'/'up'/'down' = synsretning. (x, y) er enden av snittlinja."""
        d = {"left": (-1, 0), "right": (1, 0), "up": (0, -1), "down": (0, 1)}[direction]
        # snittlinja står vinkelrett på synsretningen
        self.arrow(x, y, x + d[0] * length, y + d[1] * length, color=INK, lw=0.5, head=2.6)
        self.text(x + d[0] * (length + 3.2), y + d[1] * (length + 3.2) + size * 0.35, letter, size=size + 0.6,
                  weight=700, anchor="middle")

    def tag(self, x, y, s, *, size=T_S, fill=INK, bg=PAPER, weight=700, r=None, stroke=INK):
        """Sirkelmerke med kort tekst (f.eks. opplegg O1)."""
        r = r or max(size * 1.05, text_w(s, size, weight) / 2 + 1.0)
        self.circle(x, y, r, (stroke, 0.25, None), fill=bg)
        self.text(x, y + size * 0.36, s, size=size, weight=weight, fill=fill, anchor="middle")

    def badge(self, x, y, s, *, size=T_XS, color=INK2, fill="#eef1f4", pad=1.3, weight=600):
        """Liten etikett (avrundet). (x, y) er øvre venstre. Returnerer bredden."""
        w = text_w(s, size, weight) + 2 * pad
        h = size * 1.55
        self.rect(x, y, w, h, None, fill=fill, rx=h / 2)
        self.text(x + pad, y + h * 0.70, s, size=size, weight=weight, fill=color)
        return w

    # ---- sammenstilling ------------------------------------------------
    def svg(self) -> str:
        body = "\n".join(self.parts)
        defs = "\n".join(self.defs)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.W}mm" height="{self.H}mm" '
                f'viewBox="0 0 {self.W} {self.H}" font-family="{FONT_FAMILY}" '
                f'text-rendering="geometricPrecision" shape-rendering="geometricPrecision">\n'
                f'<defs>{defs}</defs>\n<rect width="{self.W}" height="{self.H}" fill="{PAPER}"/>\n{body}\n</svg>')

    def check(self, tol: float = 0.25) -> list[str]:
        """Maskinell kontroll: tekster som overlapper hverandre eller stikker utenfor rammen."""
        out = []
        b = self.boxes
        for i in range(len(b)):
            x0, y0, x1, y1, t = b[i]
            if x0 < self.x0 + 0.5 or x1 > self.x1 - 0.5 or y0 < self.y0 + 0.5 or y1 > self.y1 - 0.5:
                out.append(f"UTENFOR RAMME: «{t}» ({x0:.1f},{y0:.1f})–({x1:.1f},{y1:.1f})")
            for j in range(i + 1, len(b)):
                u0, v0, u1, v1, t2 = b[j]
                ox = min(x1, u1) - max(x0, u0)
                oy = min(y1, v1) - max(y0, v0)
                if ox > tol and oy > tol:
                    out.append(f"OVERLAPP {ox:.1f}×{oy:.1f} mm ved ({max(x0, u0):.0f},{max(y0, v0):.0f}): «{t}» / «{t2}»")
        return out

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.svg())
        if os.environ.get("DRAWCHECK"):
            for msg in self.check():
                print("  !", msg)


def rich(s: str) -> str:
    """Enkel markering i tekst: _{..} senket, ^{..} hevet, **..** fet. Resten escapes."""
    out = []
    i = 0
    s = str(s)
    while i < len(s):
        if s.startswith("_{", i) or s.startswith("^{", i):
            j = s.index("}", i)
            inner = esc(s[i + 2:j])
            # dy i em av tspan-ens egen (reduserte) skrift; nullstilles med et tomt tspan etterpå
            if s[i] == "_":
                out.append(f'<tspan dy="0.28em" font-size="70%">{inner}</tspan><tspan dy="-0.196em">&#8203;</tspan>')
            else:
                out.append(f'<tspan dy="-0.48em" font-size="70%">{inner}</tspan><tspan dy="0.336em">&#8203;</tspan>')
            i = j + 1
        elif s.startswith("**", i):
            j = s.find("**", i + 2)
            if j < 0:
                out.append(esc(s[i:]))
                break
            out.append(f'<tspan font-weight="700">{esc(s[i + 2:j])}</tspan>')
            i = j + 2
        else:
            out.append(esc(s[i]))
            i += 1
    return "".join(out)


def plain(s: str) -> str:
    """Fjern markeringen fra rich() (for breddemåling)."""
    return str(s).replace("_{", "").replace("^{", "").replace("}", "").replace("**", "")


# --------------------------------------------------------------------------
# Skravurmønstre
# --------------------------------------------------------------------------
HATCH_DEFS = ""


# --------------------------------------------------------------------------
# Avbildning modell -> papir
# --------------------------------------------------------------------------
class View:
    """Avbilder modellkoordinater (meter) til papir (mm).

    scale: nevner i målestokken (50 for 1:50). (px, py): papirposisjon for modellpunktet (mx, my).
    flip_y=True for snitt (z opp), False for plan (y nedover som i husets koordinater).
    """

    def __init__(self, sheet: Sheet, scale: float, px: float, py: float, mx: float = 0.0, my: float = 0.0,
                 flip_y: bool = False):
        self.s = sheet
        self.k = 1000.0 / scale      # mm papir per meter
        self.px, self.py, self.mx, self.my = px, py, mx, my
        self.flip = flip_y

    def X(self, x):
        return self.px + (x - self.mx) * self.k

    def Y(self, y):
        return self.py + (self.my - y if self.flip else y - self.my) * self.k

    def P(self, x, y):
        return (self.X(x), self.Y(y))

    def L(self, d):
        """Lengde i meter -> mm papir."""
        return d * self.k

    # bekvemmelighet: rektangel gitt ved modellhjørner
    def rect(self, x1, y1, x2, y2, style="vis", fill="none", **kw):
        X1, Y1 = self.P(x1, y1)
        X2, Y2 = self.P(x2, y2)
        self.s.rect(min(X1, X2), min(Y1, Y2), abs(X2 - X1), abs(Y2 - Y1), style, fill=fill, **kw)

    def line(self, x1, y1, x2, y2, style="vis", **kw):
        self.s.line(*self.P(x1, y1), *self.P(x2, y2), style, **kw)

    def poly(self, pts, style="vis", fill="none", close=False, **kw):
        self.s.poly([self.P(x, y) for x, y in pts], style, fill=fill, close=close, **kw)

    def dim(self, p1, p2, off, label, **kw):
        """Mållinje mellom modellpunkter; off i papir-mm."""
        self.s.dim(self.P(*p1), self.P(*p2), off, label, **kw)
