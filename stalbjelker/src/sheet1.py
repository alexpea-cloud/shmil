"""sheet1.py – Ark 1: plan 1. etasje (utsnitt) 1:50 med bjelker, opplegg, lastfelt og konstruksjon over/under."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403
import model as M              # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "results.json"), encoding="utf-8"))


def build(out_svg):
    s = Sheet()
    s.frame()
    tb = s.titleblock(title="Stålbjelker B1 og B2 – plan 1. etasje",
                      subtitle="Utsnitt 1. etasje: bjelker, opplegg, lastfelt og konstruksjon over og under",
                      drawing_no="S-01", sheet_no="1 av 3", scale="1:50", rev=M.PROJECT["rev"],
                      date=M.PROJECT["date"], project=M.PROJECT["line"], owner=M.PROJECT["owner"])
    rev_top = s.revtable(tb[0], tb[1], tb[2], M.REV_ROWS)

    s.figtitle(22, 21.5, "Plan 1. etasje – utsnitt", "1:50", "mål i meter · konstruksjon som utført 2018")

    # ------------------------------------------------------------ plan
    y_top, y_bot = M.PLAN_Y
    v = View(s, 50, 50.0, 31.0, mx=0.0, my=y_top)       # husets x = 0 -> papir x = 50
    X, Y, P, K = v.X, v.Y, v.P, v.k

    # --- lastfelt (under alt annet)
    b1x, b2x = M.B1["x"], M.B2["x"]
    c1a, c1b = M.B1_C
    c2a, c2b = M.B2_C
    # B1: 1,80 m mot vest + 0,75 m mot øst
    s.loadfield(X(b1x - 1.80), Y(c1a), K * 2.55, K * (c1b - c1a))
    # B2: gulv fra badsiden, 0,75 m, x = 0,1–2,1
    s.loadfield(X(b2x - 0.75), Y(c2a + 0.10), K * 0.75, K * 2.0)
    # B2: de to takbjelkene under terrassen (stripe 0,60 m per bjelke, mellom veggene)
    tx1, tx2 = M.TERRACE_JOIST_X
    for yj in M.TERRACE_JOISTS_Y:
        s.loadfield(X(tx1), Y(yj - 0.30), K * (tx2 - tx1), K * 0.60, blue=True)

    # --- under gulv: grunnmur, IPN 200, betongkloss, betongsøyle (stiplet)
    fx1, fy1, fx2, fy2 = M.FOUNDATION
    v.rect(fx1, fy1, fx2, fy2, "hid", fill="none")
    v.rect(*M.CONC_BLOCK, "hid", fill="#f1f1ee", opacity=0.7)
    v.rect(*M.IPN200, "hid", fill="none")

    # --- vegger
    for (x1, y1, x2, y2) in M.WALLS:
        is_log = abs(y1 - M.LOG_WALL_Y[0]) < 1e-6 and abs(y2 - M.LOG_WALL_Y[1]) < 1e-6
        if is_log:
            v.rect(x1, y1, x2, y2, (TIMBER, 0.35, None), fill=TIMBER_F)
            # stokk-linjer
            ym = (y1 + y2) / 2
            v.line(x1 + 0.03, ym, x2 - 0.03, ym, (TIMBER, 0.1, None))
        else:
            v.rect(x1, y1, x2, y2, (WALL, 0.3, None), fill=WALL_F)
    # bruddlinjer i nord og sør (utsnitt)
    for yy in (y_top, y_bot):
        s.line(X(-0.25), Y(yy), X(7.85), Y(yy), (INK3, 0.13, "4 1 0.6 1"))
    # vinduer og ytterdører
    for (x1, y1, x2, y2) in M.WINDOWS:
        v.rect(x1, y1, x2, y2, (WALL, 0.2, None), fill=PAPER)
        xm = (x1 + x2) / 2
        v.line(xm, y1, xm, y2, (WALL, 0.2, None))
    for (x1, y1, x2, y2) in M.DOORS_EXT:
        v.rect(x1, y1, x2, y2, (WALL, 0.15, None), fill=PAPER)

    # --- trapp
    sx1, sy1, sx2, sy2 = M.STAIR["outer"]
    for fl in ("flight1", "flight2"):
        fxa, fya, fxb, fyb = M.STAIR[fl]
        v.rect(fxa, fya, fxb, fyb, (INK3, 0.15, None))
        for xs in M.STAIR["steps_x"]:
            v.line(xs, fya, xs, fyb, (INK3, 0.12, None))
    s.text(X(7.02), Y(9.92), "Trapp", size=T_S, fill=INK3, anchor="middle", halo=1.0)
    s.text(X(7.02), Y(9.92) + 3.0, "(åpning i", size=T_XS, fill=INK3, anchor="middle", halo=1.0)
    s.text(X(7.02), Y(9.92) + 5.8, "etasjeskillet)", size=T_XS, fill=INK3, anchor="middle", halo=1.0)

    # --- romnavn
    for name, rx, ry in M.ROOMS:
        if y_top + 0.3 < ry < y_bot - 0.2:
            s.text(X(rx), Y(ry), name, size=T_M, fill=INK3, anchor="middle")

    # --- pipe
    cx1, cy1, cx2, cy2 = M.CHIMNEY
    s.brick(X(cx1), Y(cy1), K * (cx2 - cx1), K * (cy2 - cy1))

    # --- bjelkelag over (2. etg. gulv): spennretning
    def span_symbol(xa, xb, yy, color=INK2, label=None):
        s.arrow(X(xa) + 1.0, Y(yy), X(xb) - 1.0, Y(yy), color=color, lw=0.18, head=1.9, both=True)
        if label:
            s.text((X(xa) + X(xb)) / 2, Y(yy) - 1.0, label, size=T_XS, fill=color, anchor="middle", halo=1.2)

    span_symbol(0.197, b1x - 0.05, 7.46, label="bjelkelag 2. etasje – spennretning")
    span_symbol(b1x + 0.05, 5.319, 7.46)
    # bjelkelag over gangen (til trappevekslingen)
    for yj in M.HALL_JOISTS_Y:
        v.line(M.BATH_WALL_X, yj, b2x - 0.045, yj, (INK2, 0.2, "1.6 1.0"))
    # takbjelker under terrassen som ligger på B2
    for yj in M.TERRACE_JOISTS_Y:
        v.line(tx1, yj, tx2, yj, "blue_dash", sw=0.3)

    # --- konstruksjon over (2. etasje): strekpunkt
    v.line(M.BODVEGG2_X, M.BODVEGG2_Y[0], M.BODVEGG2_X, M.BODVEGG2_Y[1], "above")
    v.line(-0.12, M.GABLE_Y, 7.72, M.GABLE_Y, "above", sw=0.35)
    v.line(M.FORMER_WALL2_X, M.FORMER_WALL2_Y[0], M.FORMER_WALL2_X, M.FORMER_WALL2_Y[1], "above", sw=0.35)
    # taksperrer over trappa: spennretning (prinsipp)
    span_symbol(M.FORMER_WALL2_X, 7.396, 10.42, color=ABOVE)
    s.text(X(6.30), Y(10.42) + 3.0, "taksperrer", size=T_XS, fill=ABOVE, anchor="middle", halo=1.2)

    # --- stålbjelker
    for B in (M.B1, M.B2):
        v.rect(B["x"] - B["b"] / 2, B["y1"], B["x"] + B["b"] / 2, B["y2"], (STEEL, 0.25, None), fill=STEEL_D)
        for (ya, yb) in (B["sup1"], B["sup2"]):
            v.rect(B["x"] - 0.049, ya, B["x"] + 0.049, yb, (INK, 0.2, None), fill=INK)
    # betongsøyle under gulv
    colx, coly, colr = M.COLUMN
    s.circle(X(colx), Y(coly), K * colr, "hid", fill="none")

    # --- opprinnelig hjørnestolpe (fjernet 2018)
    px, py = P(*M.OLD_POST)
    s.rect(px - 2.0, py - 2.0, 4.0, 4.0, "removed", fill=PAPER, opacity=0.85)
    s.line(px - 2.0, py - 2.0, px + 2.0, py + 2.0, (RED, 0.35, None))
    s.line(px - 2.0, py + 2.0, px + 2.0, py - 2.0, (RED, 0.35, None))

    # --- bjelkenavn
    s.text(X(b1x) - 13.0, Y(6.72), "B1", size=T_XL, weight=700, fill=STEEL, anchor="end", halo=1.2)
    s.text(X(b1x) - 13.0, Y(6.72) + 3.9, "IPE 180", size=T_S, weight=600, fill=STEEL, anchor="end", halo=1.2)
    s.text(X(b2x) + 13.5, Y(11.58), "B2", size=T_XL, weight=700, fill=STEEL, halo=1.2)
    s.text(X(b2x) + 13.5, Y(11.58) + 3.9, "IPE 180", size=T_S, weight=600, fill=STEEL, halo=1.2)

    # --- oppleggsmerker O1–O4
    for (tx_, ty_, lab, ax_, ay_) in ((X(b1x) - 13.5, Y(c1a) - 2.6, "O1", X(b1x) - 1.0, Y(c1a)),
                                    (X(b1x) - 13.5, Y(c1b) - 5.0, "O2", X(b1x) - 1.0, Y(c1b)),
                                    (X(b2x) + 14.5, Y(c2a) + 5.4, "O3", X(b2x) + 1.0, Y(c2a)),
                                    (X(b2x) - 9.0, Y(c2b) - 3.6, "O4", X(b2x) - 1.0, Y(c2b))):
        s.line(tx_, ty_, ax_, ay_, (INK, 0.2, None))
        s.tag(tx_, ty_, lab, size=T_XS)

    # ------------------------------------------------------------ målsetting
    # spennvidder (senter–senter opplegg)
    s.dim(P(b1x, c1a), P(b1x, c1b), 7.0, "L = 3,63", weight=700)
    s.dim(P(b2x, c2a), P(b2x, c2b), -7.0, "L = 3,40", weight=700, side=-1, text_off=3.2)
    # felt over kjøkkenet: yttervegg – B1 – bodvegg (påskrevne mål, regnet fra B1)
    yd = 5.52
    s.dim(P(b1x - 3.60, yd), P(b1x, yd), 0, "3,60", ext=False)
    s.dim(P(b1x, yd), P(b1x + 1.50, yd), 0, "1,50", ext=False)
    # lastbredde B1
    yl = 8.12
    s.dim(P(b1x - 1.80, yl), P(b1x, yl), 0, "1,80", ext=False, color=STEEL, size=T_S)
    s.dim(P(b1x, yl), P(b1x + 0.75, yl), 0, "0,75", ext=False, color=STEEL, size=T_S)
    s.text(X(b1x - 1.80) - 1.5, Y(yl) + 1.0, "lastbredde B1", size=T_XS, fill=STEEL, weight=600, anchor="end", halo=1.0)
    s.text(X(b1x - 1.80) - 1.5, Y(yl) + 4.0, "2,55 m", size=T_XS, fill=STEEL, weight=600, anchor="end", halo=1.0)
    # bodvegg 2. etg. – avstand fra B1
    s.dim(P(b1x, 6.02), P(M.BODVEGG2_X, 6.02), 0, "ca. 0,5", ext=False, color=ABOVE, size=T_XS, text_off=0.7)
    # B2: badvegg og tidligere yttervegg 2. etg.
    s.dim(P(M.BATH_WALL_X, 9.12), P(b2x, 9.12), 0, "ca. 1,50", ext=False, size=T_S)
    s.dim(P(M.FORMER_WALL2_X, 10.80), P(b2x, 10.80), 0, "1,70", ext=False, color=ABOVE, size=T_S)
    s.dim(P(M.FORMER_WALL2_X, 10.45), P(M.BATH_WALL_X - 0.114 + 0.114, 10.45), 0, "0,20", ext=False, color=ABOVE,
          size=T_XS, text_off=0.7)
    # lastbredde B2
    s.dim(P(b2x - 0.75, 9.78), P(b2x, 9.78), 0, "0,75", ext=False, color=STEEL, size=T_S)
    # takbjelkenes felt
    yt = 12.46
    s.dim(P(M.BATH_WALL_X, yt), P(b2x, yt), 0, "ca. 1,50", ext=False, color=BLUE, size=T_S)
    s.dim(P(b2x, yt), P(M.ENTRE_EAST_WALL_X, yt), 0, "ca. 1,65", ext=False, color=BLUE, size=T_S)
    # husbredde
    s.dim(P(0, y_top - 0.02), P(7.593, y_top - 0.02), 4.0, "7,60 (husbredde iht. E2)", size=T_XS, color=INK3,
          text_off=0.7, side=-1)

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

    # ------------------------------------------------------------ snittmarkeringer
    # A–A langs B1 og B–B langs B2 (begge sett mot øst); C–C tvers på B2 (sett mot nord)
    def secmark(x, y, letter, dx, dy, lx=0.0, ly=0.0):
        """Snittmerke i (x, y) med synsretning (dx, dy)."""
        nx_, ny_ = -dy, dx
        s.line(x - nx_ * 2.6, y - ny_ * 2.6, x + nx_ * 2.6, y + ny_ * 2.6, (INK, 0.6, None))
        s.arrow(x, y, x + dx * 5.2, y + dy * 5.2, color=INK, lw=0.4, head=2.2)
        s.text(x + dx * 7.8 + lx, y + dy * 7.8 + 1.25 + ly, letter, size=T_L, weight=700, anchor="middle", halo=1.2)

    secmark(X(b1x), Y(4.22), "A", 1, 0)
    secmark(X(b1x), Y(9.56), "A", 1, 0)
    secmark(X(b2x), Y(8.30), "B", 1, 0)
    secmark(X(b2x), Y(13.02), "B", 1, 0)
    yc = 9.72
    secmark(X(2.62), Y(yc), "C", 0, -1)
    secmark(X(7.86), Y(yc), "C", 0, -1)

    # ------------------------------------------------------------ nummererte henvisninger
    px, py = P(*M.OLD_POST)
    marks = [
        (1, (X(cx2), Y(cy2) - 1.2), (X(4.80), Y(5.12)), INK),
        (2, (X(M.BODVEGG2_X), Y(6.62)), (X(4.86), Y(6.62)), ABOVE),
        (3, (X(2.52), Y(6.45)), (X(2.52), Y(6.45)), STEEL),
        (4, (X(M.IPN200[2]) - 0.3, Y(7.42)), (X(4.86), Y(7.42)), INK2),
        (5, (X(6.30), Y(8.70)), (X(6.30), Y(8.33)), TIMBER),
        (6, (X(b2x - 0.42), Y(10.18)), (X(b2x - 0.42), Y(10.18)), STEEL),
        (7, (X(M.FORMER_WALL2_X), Y(10.12)), (X(2.80), Y(10.12)), ABOVE),
        (8, (px + 2.0, py + 1.2), (X(5.36), Y(11.215)), RED),
        (9, (X(1.30), Y(M.GABLE_Y)), (X(1.30), Y(10.72)), ABOVE),
        (10, (X(6.28), Y(M.TERRACE_JOISTS_Y[1])), (X(6.28), Y(11.66)), BLUE),
    ]
    for n, anchor, pos, col_ in marks:
        s.callout(n, anchor, pos, color=col_)

    lx = 212.0
    lw = 80.0
    r1 = R["B1"]
    r2 = R["B2"]
    s.text(lx, 20.5, "Henvisninger", size=T_L, weight=700)
    items = [
        (1, "Teglsteinspipe", "Tatt ut av bruk som skorstein i 2018 og revet over tak. Står igjen innvendig. "
            "Opplegg O1 står mot pipas forside, på hjørnet.", INK),
        (2, "Bodvegg i 2. etasje (over)", "Lettvegg ca. 0,5 m fra B1. Bærer ikke taklast (vurdert ved befaring). "
            "Regnet som 0,5 kN/m egenlast på B1.", ABOVE),
        (3, "Bjelkelag over kjøkkenet – lastfelt B1", "Eldre gulvbjelker og fire nye (2018) som går fra ytterveggen til "
            "ca. 0,5 m forbi B1. Bjelkelaget ligger oppå overflensen. Felt 3,60 m og 1,50 m gir lastbredde 2,55 m.", STEEL),
        (4, "IPN 200 under gulvet", "Ligger i krypkjelleren rett under B1, fra betongklossen ved pipa til en stålkonsoll "
            "i grunnmuren.", INK2),
        (5, "Tømmervegg på grunnmur", "Opprinnelig yttervegg, ca. 0,20 m, på grunnmur ca. 0,25 m. Opplegg O2 og O3 står i "
            "den tidligere døråpningen i tømmerveggen, rett over grunnmuren.", TIMBER),
        (6, "Bjelkelag over gangen – lastfelt B2", "Går fra badveggen (ca. 1,50 m) til trappevekslingen, som ligger på B2 "
            "langs trappeåpningen. Lastbredde 0,75 m. Ellers i gangen ligger bjelkene på veggene.", STEEL),
        (7, "Tidligere yttervegg i 2. etasje (over)", "Opplegg for taksperrene over trappa: 1,70 m fra B2, dvs. 0,20 m "
            "bak badveggen. Taklasten går via denne veggen og ytterveggen, ikke ned i B2 (opplyst av tiltakshaver; "
            "videre lastvei er ikke kontrollert).", ABOVE),
        (8, "Opprinnelig hjørnestolpe – fjernet 2018", "Sto ca. 2,25 m fra O3 og ca. 1,15 m fra O4. Målene viser hvor "
            "stolpen sto, ikke dagens opplegg.", RED),
        (9, "Gavlvegg i 2. etasje (over)", "Står over B2 der hjørnestolpen sto. Sperretak uten mønsås. Gavlveggen er "
            "regnet med egenvekt som punktlast på B2.", ABOVE),
        (10, "Takbjelker under takterrassen", "c/c 0,60 m, fra soveromsveggen til ytterveggen. To av dem ligger også på "
             "B2 (ca. 2,55 og 3,15 m fra O3). Resten av terrassen bæres av veggene.", BLUE),
    ]
    s.callout_list(lx, 25.0, lw, items)

    # ------------------------------------------------------------ høyre kolonne: oppleggstabell, tegnforklaring
    cx = 300.0
    cw = 108.0
    s.text(cx, 20.5, "Opplegg", size=T_L, weight=700)
    rows = [["", "Opplegg", "Lastvei ned", "R_{Ed}"],
            ["O1", "B1 ved pipa", "2 × 48×98 → gulvbjelke → IPN 200 → betongkloss", f"{num(r1['VEd'], 1)} kN"],
            ["O2", "B1 mot grunnmur", "2 × 48×148 → tømmerstokk 148×148 → grunnmur", f"{num(r1['VEd'], 1)} kN"],
            ["O3", "B2 mot grunnmur", "2 × 48×148 → tømmerstokk 148×148 → grunnmur", f"{num(r2['RA'], 1)} kN"],
            ["O4", "B2 ved betongsøyle", "2 × 48×98 → gulvbjelke → stolpesko → betongsøyle", f"{num(r2['RB'], 1)} kN"]]
    wts = [[None] * 4] + [[700, None, None, 700] for _ in range(4)]
    yt2 = s.table(cx, 23.0, [7, 26, 61, 14], rows, size=T_XS, row_h=4.6, align=["l", "l", "l", "r"], weights=wts)
    s.mtext(cx, yt2 + 3.4, wrap("R_{Ed} = dimensjonerende oppleggskraft (1,35 g + 1,5 q), se ark 2–3 og beregningsnotat rev. 11. "
                                "Oppleggenes videre lastføring er bare delvis dokumentert – se notatets kap. om opplegg.",
                                T_XS, cw), size=T_XS, fill=INK2)

    # tegnforklaring
    ly = yt2 + 16.0
    s.text(cx, ly, "Tegnforklaring", size=T_L, weight=700)
    ly += 4.2
    lg_h = 5.6

    def lg(sym, text, sub=None):
        nonlocal ly
        sym(cx, ly)
        s.text(cx + 20, ly + 0.9, text, size=T_S)
        if sub:
            s.text(cx + 20, ly + 0.9 + 2.9, sub, size=T_XS, fill=INK3)
            ly += 2.6
        ly += lg_h

    lg(lambda x, y: s.rect(x, y - 1.3, 16, 2.6, (STEEL, 0.25, None), fill=STEEL_D), "Stålbjelke IPE 180 (montert 2018)")
    lg(lambda x, y: s.rect(x + 6.5, y - 1.5, 3.0, 3.0, (INK, 0.2, None), fill=INK), "Opplegg – stendere under bjelkeende (2018)")
    lg(lambda x, y: s.rect(x, y - 1.5, 16, 3.0, (WALL, 0.3, None), fill=WALL_F), "Vegg 1. etasje (snittet)", "veggeometri etter E2 – ikke kontrollmålt")
    lg(lambda x, y: s.rect(x, y - 1.5, 16, 3.0, (TIMBER, 0.35, None), fill=TIMBER_F), "Tømmervegg – opprinnelig yttervegg")
    lg(lambda x, y: s.brick(x + 5, y - 2.0, 6, 4.0), "Teglsteinspipe (ute av bruk)")
    lg(lambda x, y: s.line(x, y, x + 16, y, "above", sw=0.35), "Vegg i 2. etasje (over snittplanet)")
    lg(lambda x, y: s.line(x, y, x + 16, y, "hid"), "Under gulvet: grunnmur, IPN 200, betongkloss, søyle")
    lg(lambda x, y: s.line(x, y, x + 16, y, (INK2, 0.2, "1.6 1.0")), "Bjelkelag over gangen (prinsipp)")
    lg(lambda x, y: s.line(x, y, x + 16, y, "blue_dash", sw=0.3), "Takbjelke under takterrassen som ligger på B2")
    lg(lambda x, y: s.loadfield(x, y - 1.6, 16, 3.2), "Lastfelt: gulv 2. etasje som bæres av bjelken")
    lg(lambda x, y: s.loadfield(x, y - 1.6, 16, 3.2, blue=True),
       "Lastfelt: takterrasse (egenlast, snø/bruk) via to takbjelker")

    def sym_removed(x, y):
        s.rect(x + 6, y - 2, 4, 4, "removed", fill=PAPER)
        s.line(x + 6, y - 2, x + 10, y + 2, (RED, 0.35, None))
        s.line(x + 6, y + 2, x + 10, y - 2, (RED, 0.35, None))
    lg(sym_removed, "Fjernet 2018 (opprinnelig hjørnestolpe)")

    def sym_span(x, y):
        s.arrow(x + 0.5, y, x + 15.5, y, color=INK2, lw=0.18, head=1.9, both=True)
    lg(sym_span, "Spennretning for bjelkelag / sperrer")

    def sym_sec(x, y):
        s.line(x + 3, y - 2.2, x + 3, y + 2.2, (INK, 0.55, None))
        s.arrow(x + 3, y, x + 9, y, color=INK, lw=0.4, head=2.2)
        s.text(x + 12, y + 1.2, "A", size=T_M, weight=700, anchor="middle")
    lg(sym_sec, "Snitt – A og B på ark 2 og 3, C på ark 3")
    lg(lambda x, y: s.tag(x + 8, y, "O1", size=T_XS), "Oppleggsnummer (se tabell over)")

    # forbehold
    yb_box = s.notebox(cx, ly + 1.0, cw, "Status og forbehold", [
        "Prinsippskisse av konstruksjonen slik den ble utført i 2018. Ikke arbeidstegning og ikke fullstendig "
        "prosjektering.",
        "Mål merket «ca.» er ikke kontrollmålt. Øvrige mål er oppgitt av tiltakshaver etter oppmåling. "
        "Påskrevne mål gjelder foran målestokk; veggeometrien er hentet fra E2.",
        "Stålkvalitet S235 og trevirkets fasthetsklasse er forutsatt, ikke dokumentert.",
    ], size=T_XS, tsize=T_S, accent=AMBER)

    # ------------------------------------------------------------ resultatsammendrag
    ry = yb_box + 6.0
    s.text(cx, ry, "Beregningsresultat – sammendrag", size=T_L, weight=700)
    r1s = R["B1_sens"]
    res = R["section"]
    rows = [["Bjelke", "Spenn", "M_{Ed}", "M_{Rd}", "Utnyttelse", "Nedbøyning", "L/300"],
            ["B1 kjøkken", "3,63 m", f"{num(r1['MEd'], 1)} kNm", f"{num(res['MRd_el'], 1)} kNm", f"{num(r1['util_M'] * 100, 0)} %",
             f"{num(r1['delta_gq'], 1)} mm", f"{num(r1['delta_lim'], 1)} mm"],
            ["B2 gang", "3,40 m", f"{num(r2['MEd'], 1)} kNm", f"{num(res['MRd_el'], 1)} kNm", f"{num(r2['util_M'] * 100, 0)} %",
             f"{num(r2['delta_gq'], 1)} mm", f"{num(r2['delta_lim'], 1)} mm"]]
    wts2 = [[None] * 7, [700, None, None, None, 700, None, None], [700, None, None, None, 700, None, None]]
    ye = s.table(cx, ry + 2.5, [22, 13, 16, 16, 15, 15, 11], rows, size=T_XS, row_h=4.6,
                 align=["l", "r", "r", "r", "r", "r", "r"], weights=wts2)
    s.mtext(cx, ye + 3.4, wrap("Elastisk momentkapasitet, S235 forutsatt. Forutsetter at overflensen er sideveis fastholdt av "
                               "bjelkelaget. B1 med full kontinuitet i bjelkelaget (lastbredde 3,71 m): "
                               f"{num(r1s['util_M'] * 100, 0)} %. Se ark 2–3 og beregningsnotat rev. 11.", T_XS, cw),
            size=T_XS, fill=INK2)

    # ------------------------------------------------------------ målestokk
    s.scalebar(50.0, 262.0, K, meters=(0, 1, 2, 3, 4, 5), sub=0.5)
    s.text(50.0, 272.0, "Målestokk 1:50 gjelder ved utskrift i A3. Ved annen utskrift: bruk målestokklinjalen.",
           size=T_XS, fill=INK3)
    s.text(50.0, 275.6, "Himmelretning er ikke angitt i grunnlaget (E2) og vises derfor ikke. Planen er orientert som E2.",
           size=T_XS, fill=INK3)
    s.save(out_svg)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "S-01.svg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out)
    print("skrev", out)
