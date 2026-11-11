"""kort1.py – Ark 1 av 3 (E3-1): plan 1. etasje (utsnitt) 1:50 med stålbjelkene B1 og B2 og oppleggene.

Forenklet prinsippskisse. Geometrien og tegnemåten er den samme som i det detaljerte arket (sheet1.py).
Laster, lastfelt, nummererte henvisninger, tabeller og beregning er ikke med her.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403
import model as M              # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- plassering på arket (mm) ----
PX, PY = 72.0, 36.0            # papirpunktet for husets x = 0 og y = M.PLAN_Y[0]
COL_X, COL_Y = 300.0, 55.0     # høyre kolonne: tegnforklaring, målestokklinjal, merknad
DIM_OFF = 9.0                  # avstand fra bjelke til mållinja for spennvidden

CROP_ST = (INK3, 0.13, "4 1 0.6 1")          # utsnittsgrense
GONE_ST = (RED, 0.25, "1.6 0.9")             # bærevegg fjernet 2018
LEAD_W = 0.15                                # ledelinjer


def build(out_svg):
    s = Sheet()
    s.frame(M.PROJECT["attachment"])
    s.titleblock(title="Stålbjelker B1 og B2 – plan 1. etasje",
                 subtitle="Utsnitt av 1. etasje med stålbjelker og opplegg",
                 drawing_no="E3-1", sheet_no="1 av 3", scale="1:50", rev="–",
                 date=M.PROJECT["date"], project=M.PROJECT["line"], owner=M.PROJECT["owner"], case=M.PROJECT["case"],
                 status="PRINSIPPSKISSE – SOM UTFØRT 2018", author=M.PROJECT["owner"], review=False)
    s.figtitle(22, 21.5, "Plan 1. etasje – utsnitt", "1:50")

    y_top, y_bot = M.PLAN_Y
    v = View(s, 50, PX, PY, mx=0.0, my=y_top)
    X, Y, P, K = v.X, v.Y, v.P, v.k
    b1x, b2x = M.B1["x"], M.B2["x"]
    c1a, c1b = M.B1_C                       # oppleggssentre B1 (y)
    c2a, c2b = M.B2_C                       # oppleggssentre B2 (y)
    HB = 0.049                              # halv bredde av opplegget (to stendere, 98 mm)

    def note(x, y, lines, *, size=T_XS, fill=INK2, anchor="start", w1=None, lh=1.32):
        """Kort påskrift over én eller flere linjer; y er grunnlinjen til første linje. w1 = vekt på første linje."""
        for i, ln in enumerate(lines):
            s.text(x, y + i * size * lh, ln, size=size, fill=(INK if (i == 0 and w1) else fill), anchor=anchor,
                   weight=(w1 if (i == 0 and w1) else 400))

    def lead(start, *ends, color=INK3, dot=True):
        """Ledelinje fra påskriften (start) til det den peker på (én eller flere ender)."""
        for (ex, ey) in ends:
            s.line(start[0], start[1], ex, ey, (color, LEAD_W, None))
            if dot:
                s.circle(ex, ey, 0.42, None, fill=color)

    # ------------------------------------------------------------ under gulvet (stiplet)
    v.rect(*M.FOUNDATION, "hid", fill="none")                       # gammel grunnmur under tømmerveggen
    v.rect(*M.CONC_BLOCK, "hid", fill=CONC_F, opacity=0.7)          # støpt betongkloss ved pipa
    v.rect(*M.IPN200, "hid", fill="none")                           # eldre stålbjelke, ligger rett under B1

    # ------------------------------------------------------------ vegger, vinduer, dører
    for (x1, y1, x2, y2) in M.WALLS:
        is_log = abs(y1 - M.LOG_WALL_Y[0]) < 1e-6 and abs(y2 - M.LOG_WALL_Y[1]) < 1e-6
        if is_log:
            v.rect(x1, y1, x2, y2, (TIMBER, 0.35, None), fill=TIMBER_F)
        else:
            v.rect(x1, y1, x2, y2, (WALL, 0.3, None), fill=WALL_F)
    for yy in (y_top, y_bot):                                       # planen fortsetter i nord og sør
        s.line(X(-0.25), Y(yy), X(7.72), Y(yy), CROP_ST)
    for (x1, y1, x2, y2) in M.WINDOWS:
        v.rect(x1, y1, x2, y2, (WALL, 0.2, None), fill=PAPER)
        xm = (x1 + x2) / 2
        v.line(xm, y1, xm, y2, (WALL, 0.2, None))
    for (x1, y1, x2, y2) in M.DOORS_EXT:
        v.rect(x1, y1, x2, y2, (WALL, 0.15, None), fill=PAPER)

    # ------------------------------------------------------------ trapp
    for fl in ("flight1", "flight2"):
        fxa, fya, fxb, fyb = M.STAIR[fl]
        v.rect(fxa, fya, fxb, fyb, (INK3, 0.15, None))
        for xs in M.STAIR["steps_x"]:
            v.line(xs, fya, xs, fyb, (INK3, 0.12, None))
    s.text(X(7.02), Y(9.92), "Trapp", size=T_M, fill=INK3, anchor="middle")

    # ------------------------------------------------------------ romnavn
    for name, rx, ry in (("Stue", 2.00, 4.00), ("Kjøkken", 1.55, 5.40), ("Vaskerom", 6.55, 5.22), ("Bod", 6.65, 8.38),
                         ("Bad", 1.40, 10.35), ("Gang", 3.93, 9.40), ("Entré", 3.95, 12.33), ("Soverom", 1.75, 12.95),
                         ("Soverom", 6.30, 13.35)):
        s.text(X(rx), Y(ry), name, size=T_M, fill=INK3, anchor="middle")

    # ------------------------------------------------------------ teglsteinspipa
    cx1, cy1, cx2, cy2 = M.CHIMNEY
    s.brick(X(cx1), Y(cy1), K * (cx2 - cx1), K * (cy2 - cy1))

    # ------------------------------------------------------------ over snittplanet: 2. etasje og takterrasse
    def span_symbol(xa, xb, yy, label=None):
        """Dobbeltpil: spennretning for bjelkelaget i 2. etasje."""
        s.arrow(X(xa) + 1.0, Y(yy), X(xb) - 1.0, Y(yy), color=INK2, lw=0.18, head=1.9, both=True)
        if label:
            s.text((X(xa) + X(xb)) / 2, Y(yy) - 1.1, label, size=T_XS, fill=INK2, anchor="middle")

    span_symbol(0.197, b1x - 0.085, 6.50, label="bjelkelag 2. etasje – spennretning")      # over kjøkkenet
    span_symbol(M.BATH_WALL_X, b2x - 0.085, 9.075)                                         # over gangen
    tx1, tx2 = M.TERRACE_JOIST_X
    for yj in M.TERRACE_JOISTS_Y:                                                           # takbjelkene som ligger på B2
        v.line(tx1, yj, tx2, yj, "blue_dash", sw=0.3)
    v.line(M.BODVEGG2_X, M.BODVEGG2_Y[0], M.BODVEGG2_X, M.BODVEGG2_Y[1], "above")           # lettvegg i 2. etasje
    v.line(-0.12, M.GABLE_Y, 7.72, M.GABLE_Y, "above", sw=0.35)                             # gavlvegg i 2. etasje
    v.line(M.FORMER_WALL2_X, M.FORMER_WALL2_Y[0], M.FORMER_WALL2_X, M.FORMER_WALL2_Y[1], "above", sw=0.35)

    # ------------------------------------------------------------ stålbjelker, opplegg, det som ble fjernet i 2018
    for B in (M.B1, M.B2):
        v.rect(B["x"] - B["b"] / 2, B["y1"], B["x"] + B["b"] / 2, B["y2"], (STEEL, 0.25, None), fill=STEEL_D)
        for (ya, yb) in (B["sup1"], B["sup2"]):
            v.rect(B["x"] - HB, ya, B["x"] + HB, yb, (INK, 0.2, None), fill=INK)
    v.rect(b1x - 0.085, M.B1["sup1"][1], b1x + 0.085, M.LOG_WALL_Y[0], GONE_ST)             # bærevegg langs B1
    v.rect(b2x - 0.085, M.LOG_WALL_Y[1], b2x + 0.085, M.B2["sup2"][0], GONE_ST)             # bærevegg langs B2
    colx, coly, colr = M.COLUMN
    s.circle(X(colx), Y(coly), K * colr, "hid", fill="none")                                # betongsøyle under gulvet
    px, py = P(*M.OLD_POST)                                                                 # opprinnelig hjørnestolpe
    s.rect(px - 2.0, py - 2.0, 4.0, 4.0, "removed", fill=PAPER, opacity=0.85)
    s.line(px - 2.0, py - 2.0, px + 2.0, py + 2.0, (RED, 0.35, None))
    s.line(px - 2.0, py + 2.0, px + 2.0, py - 2.0, (RED, 0.35, None))

    # ------------------------------------------------------------ mål
    # spennvidder, senter–senter opplegg (mållinja på vestsiden av bjelkene)
    s.dim(P(b1x, c1a), P(b1x, c1b), DIM_OFF, "L = 3,63", weight=700, text_shift=15.0)
    s.dim(P(b2x, c2a), P(b2x, c2b), DIM_OFF, "L = 3,40", weight=700, text_shift=-12.2)
    # yttervegg – B1 – veggen mot vaskerommet
    yd = 6.95
    s.dim(P(0.197, yd), P(b1x, yd), 0, "3,60", ext=False)
    s.dim(P(b1x, yd), P(5.319, yd), 0, "1,50", ext=False, text_shift=3.6)
    # lettveggen i 2. etasje – avstand fra B1 (teksten står til høyre for veggen)
    y05 = 6.15
    s.dim(P(b1x, y05), P(M.BODVEGG2_X, y05), 0, "", ext=False, color=ABOVE)
    s.text(X(M.BODVEGG2_X) + 2.0, Y(y05) + 0.85, "ca. 0,5", size=T_XS, fill=ABOVE, weight=500)
    # veggen i 2. etasje der taksperrene over trappa ligger opp – avstand fra B2 (gjennom døråpningen til badet)
    s.dim(P(M.FORMER_WALL2_X, 10.575), P(b2x, 10.575), 0, "1,70", ext=False, color=ABOVE, size=T_S)
    # badveggen – B2 – ytterveggen (feltene til takbjelkene under takterrassen)
    yt = 11.50
    s.dim(P(M.BATH_WALL_X, yt), P(b2x, yt), 0, "ca. 1,50", ext=False, size=T_S, side=-1, text_off=3.0, text_shift=-4.2)
    s.dim(P(b2x, yt), P(M.ENTRE_EAST_WALL_X, yt), 0, "ca. 1,65", ext=False, size=T_S, side=-1, text_off=3.0)
    # husbredde
    s.dim(P(0, y_top - 0.02), P(7.593, y_top - 0.02), -4.4, "7,60", size=T_S)

    # ------------------------------------------------------------ påskrifter: bjelkene
    s.text(X(b1x) - DIM_OFF - 5.0, Y(7.63), "B1 – IPE 180", size=T_L, weight=700, fill=STEEL, anchor="end")
    s.text(X(b1x) - DIM_OFF - 5.0, Y(7.63) + 4.1, "rett under B1: eldre stålbjelke i krypkjelleren", size=T_XS,
           fill=INK2, anchor="end")
    s.text(X(b2x) + 8.0, Y(12.35), "B2 – IPE 180", size=T_L, weight=700, fill=STEEL)

    # ------------------------------------------------------------ påskrifter: oppleggene
    # B1 ved teglsteinspipa (ledelinja går gjennom døråpningen til vaskerommet)
    xl = X(5.432) + 3.4
    note(xl, Y(5.70), ["2 stendere 48 × 98", "ved teglsteinspipa"], size=T_S, w1=600)
    lead((xl - 1.5, Y(5.70) - 0.9), (X(b1x + HB), Y(c1a) + 0.3), dot=False)
    note(xl, Y(5.70) + 9.6, ["støpt betongkloss", "under gulvet"])
    lead((xl - 1.5, Y(5.70) + 8.8), (X(M.CONC_BLOCK[2]) - 0.5, Y(5.62)))
    # B1 og B2 ved tømmerveggen (felles påskrift, ledelinjene går gjennom døråpningen til boden)
    yb = Y(7.525)
    note(xl, yb, ["2 stendere 48 × 148", "ved tømmerveggen"], size=T_S, w1=600)
    lead((xl - 1.5, yb - 0.9), (X(b2x), Y(M.B2["sup1"][0])), (X(b1x + HB), Y(c1b) - 0.2), dot=False)
    # B2 ved betongsøylen (ledelinja går gjennom døråpningen mellom entréen og soverommet)
    xs_, ys_ = X(M.BATH_WALL_X) + 2.4, Y(12.642) + 6.8
    note(xs_, ys_, ["2 stendere 48 × 98", "over betongsøyle Ø ca. 200"], size=T_S, w1=600)
    lead((xs_ + 17.5, ys_ - 2.7), (X(b2x - HB), Y(M.B2["sup2"][1])), dot=False)

    # ------------------------------------------------------------ påskrifter: fjernet 2018 (rødt)
    xr = DIM_OFF - 0.085 * K                                         # bredden mellom mållinja og veggkonturen
    s.text(X(b1x) - DIM_OFF + xr / 2 + 0.7, Y(7.71), "bærevegg fjernet 2018", size=T_XS, fill=RED, anchor="middle", rot=90)
    s.text(X(b2x) - DIM_OFF + xr / 2 + 0.7, Y(9.81), "bærevegg fjernet 2018", size=T_XS, fill=RED, anchor="middle", rot=90)
    xp = X(b2x) - DIM_OFF - 4.1
    note(xp, py - 5.8, ["hjørnestolpe", "fjernet 2018"], fill=RED, anchor="end")
    lead((xp + 1.5, py - 5.0), (px - 2.0, py - 1.0), color=RED, dot=False)

    # ------------------------------------------------------------ påskrifter: under gulvet, vegger, pipe
    s.text(X(0.40), Y(M.LOG_WALL_Y[0]) - 2.2, "tømmervegg (opprinnelig yttervegg)", size=T_XS, fill=TIMBER)
    s.text(X(0.40), Y(M.LOG_WALL_Y[1]) + 4.7, "gammel grunnmur under tømmerveggen", size=T_XS, fill=INK2)
    xc = X(cx2) + 6.3
    s.text(xc, Y(cy1) - 6.1, "teglsteinspipe (ute av bruk)", size=T_XS, fill=BRICK)
    lead((xc - 1.5, Y(cy1) - 6.9), (X(cx2) - 1.3, Y(cy1) + 1.2), color=BRICK)

    # ------------------------------------------------------------ påskrifter: over snittplanet
    s.text(X(M.BODVEGG2_X) - 1.2, Y(7.65), "lettvegg i 2. etasje", size=T_XS, fill=ABOVE, anchor="middle", rot=90)
    xw = X(M.FORMER_WALL2_X) - 5.1
    note(xw, Y(9.55), ["vegg i 2. etasje –", "opplegg for taksperrene", "over trappa"], fill=ABOVE, anchor="end")
    lead((xw + 1.5, Y(9.55) - 0.8), (X(M.FORMER_WALL2_X), Y(9.55) + 1.4), color=ABOVE)
    s.text(X(7.72) + 2.0, Y(M.GABLE_Y) + 0.9, "gavlvegg i 2. etasje", size=T_XS, fill=ABOVE)
    xt_, yt_ = X(7.72) + 2.0, Y(11.662)
    s.text(xt_, yt_ + 0.9, "takbjelker under takterrassen", size=T_XS, fill=BLUE)
    lead((xt_ - 1.5, yt_), *[(X(tx2) - 1.6, Y(yj)) for yj in M.TERRACE_JOISTS_Y], color=BLUE)

    # --- hva som ligger over (venstre marg)
    xm = X(-0.42)
    s.line(xm, Y(y_top) + 1, xm, Y(M.GABLE_Y) - 1.0, (ABOVE, 0.3, None))
    s.text(xm - 1.6, (Y(y_top) + Y(M.GABLE_Y)) / 2, "2. etasje over", size=T_S, fill=ABOVE, weight=600, anchor="middle",
           rot=90)
    s.line(xm, Y(M.GABLE_Y) + 1.0, xm, Y(y_bot) - 1, (BLUE, 0.3, None))
    s.text(xm - 1.6, (Y(M.GABLE_Y) + Y(y_bot)) / 2, "takterrasse over", size=T_S, fill=BLUE, weight=600,
           anchor="middle", rot=90)
    for yy_ in (Y(y_top) + 1, Y(M.GABLE_Y) - 1.0):
        s.line(xm - 1.0, yy_, xm + 1.0, yy_, (ABOVE, 0.3, None))
    for yy_ in (Y(M.GABLE_Y) + 1.0, Y(y_bot) - 1):
        s.line(xm - 1.0, yy_, xm + 1.0, yy_, (BLUE, 0.3, None))

    # ------------------------------------------------------------ snittmerker A–A (langs B1) og B–B (langs B2), sett mot øst
    def secmark(x, y, letter):
        s.line(x, y - 2.6, x, y + 2.6, (INK, 0.6, None))
        s.arrow(x, y, x + 5.2, y, color=INK, lw=0.4, head=2.2)
        s.text(x + 7.8, y + 1.25, letter, size=T_L, weight=700, anchor="middle")

    for bx, letter in ((b1x, "A"), (b2x, "B")):
        secmark(X(bx), Y(3.80), letter)
        secmark(X(bx), Y(13.70), letter)

    # ------------------------------------------------------------ høyre kolonne: tegnforklaring, linjal, merknad
    s.text(COL_X, COL_Y, "Tegnforklaring", size=T_M, weight=700)
    ly = COL_Y + 7.5
    SW = 14.0

    def lg(sym, text):
        nonlocal ly
        sym(COL_X, ly - 0.9)
        s.text(COL_X + SW + 4.0, ly, text, size=T_S, fill=INK2)
        ly += 6.2

    def sym_removed(x, y):
        s.rect(x, y - 1.3, 8.0, 2.6, GONE_ST)
        s.rect(x + 10.0, y - 2.0, 4.0, 4.0, "removed", fill=PAPER)
        s.line(x + 10.0, y - 2.0, x + 14.0, y + 2.0, (RED, 0.35, None))
        s.line(x + 10.0, y + 2.0, x + 14.0, y - 2.0, (RED, 0.35, None))

    def sym_sec(x, y):
        s.line(x + 2.0, y - 2.2, x + 2.0, y + 2.2, (INK, 0.55, None))
        s.arrow(x + 2.0, y, x + 7.2, y, color=INK, lw=0.4, head=2.2)
        s.text(x + 10.6, y + 1.1, "A", size=T_M, weight=700, anchor="middle")

    lg(lambda x, y: s.rect(x, y - 1.2, SW, 2.4, (STEEL, 0.25, None), fill=STEEL_D), "Stålbjelke IPE 180, montert 2018")
    lg(lambda x, y: s.rect(x + SW / 2 - 1.5, y - 1.5, 3.0, 3.0, (INK, 0.2, None), fill=INK), "Opplegg: to stendere under bjelkeenden")
    lg(lambda x, y: s.rect(x, y - 1.4, SW, 2.8, (WALL, 0.3, None), fill=WALL_F), "Vegg i 1. etasje")
    lg(lambda x, y: s.rect(x, y - 1.4, SW, 2.8, (TIMBER, 0.35, None), fill=TIMBER_F), "Tømmervegg (opprinnelig yttervegg)")
    lg(sym_removed, "Fjernet 2018: bærevegg og hjørnestolpe")
    lg(lambda x, y: s.line(x, y, x + SW, y, "hid"), "Under gulvet")
    lg(lambda x, y: s.line(x, y, x + SW, y, "above", sw=0.35), "Vegg i 2. etasje (over)")
    lg(lambda x, y: s.line(x, y, x + SW, y, "blue_dash", sw=0.3), "Takbjelke under takterrassen")
    lg(lambda x, y: s.arrow(x + 0.5, y, x + SW - 0.5, y, color=INK2, lw=0.18, head=1.9, both=True),
       "Spennretning for bjelkelaget i 2. etasje")
    lg(sym_sec, "Snitt A–A på ark 2 og B–B på ark 3")

    s.scalebar(COL_X, ly + 6.0, K, meters=(0, 1, 2, 3), sub=0.5)
    s.mtext(COL_X, ly + 21.0, ["Mål i meter, tverrsnitt i mm.", "Mål merket «ca.» er omtrentlige.",
                               "Veggene er tegnet etter etasjeplanen E2.", "Påskrevne mål gjelder.",
                               "L er målt senter–senter opplegg."], size=T_S, fill=INK2)

    s.save(out_svg)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "E3-1.svg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out)
    print("skrev", out)
