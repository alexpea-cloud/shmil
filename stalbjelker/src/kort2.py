"""kort2.py – Ark 2 av 3 (E3-2): snitt A–A langs stålbjelke B1 ved kjøkkenet, 1:20.

Forenklet prinsippskisse: bjelken, de to oppleggene og det som ligger under gulvet. Geometrien er den samme
som i det detaljerte arket (sheet2.py). Laster, beregning og detaljutsnitt er ikke med her.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403
import model as M              # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- geometri i snittet (m). x fra oppleggssenter ved pipa mot tømmerveggen; z opp fra overkant gulv 1. etasje ----
L = 3.63
H_STUD = 2.07                               # stenderhøyde: underkant stendere – underkant stålbjelke
Z_BB, Z_BT = H_STUD, H_STUD + 0.18          # stålbjelke under-/overkant
J2_H, BOARD2 = 0.148, 0.037                 # gulvbjelker og gulv i 2. etasje
Z_F2 = Z_BT + J2_H + BOARD2                 # overkant gulv 2. etasje
Z_TOP = Z_F2 + 0.27                         # bruddlinje i pipe og tømmervegg
BOARD1, J1_H = 0.022, 0.198                 # gulvbord og gulvbjelker 48 x 198 i 1. etasje
Z_J1T, Z_J1B = -BOARD1, -BOARD1 - J1_H
Z_OLDB = Z_J1B - 0.200                      # underkant eldre stålbjelke
Z_GROUND = -0.800                           # terreng i krypkjelleren (tegnet enkelt, ikke målsatt)
Z_BOT = -0.905                              # bruddlinje nederst
X_CHIM = (-0.454, -0.049)
X_BLOCK = (-0.300, 0.600)
X_OLD = (-0.340, 3.529)                     # eldre stålbjelke: fra betongklossen fram til grunnmuren
X_FOUND = (3.529, 3.779)
X_LOG = (3.580, 3.728)
X_LOGWALL = (3.547, 3.761)
JOISTS1 = [0.0, 0.6, 1.2, 1.8, 2.4, 3.0]
JOISTS2 = [0.42, 1.02, 1.62, 2.22, 2.82, 3.42]

# ---- plassering på arket (mm) ----
PX, PY = 88.0, 186.0                        # papirpunktet for x = 0, z = 0 (overkant gulv 1. etasje)
COL_X = 333.3                               # høyre kolonne: tegnforklaring, målestokklinjal, merknad
COL_Y = 57.0

CENTER = (INK2, 0.13, "3 0.8 0.5 0.8")      # senterlinje i oppleggene


def stud(s, x, y, w, h, step=1.0):
    """Stendere fra 2018: fylt felt med tette loddrette streker, slik at de også skiller seg ut i svart-hvitt."""
    s.rect(x, y, w, h, "timber_cut", fill=TIMBER_F2)
    xx = x + step
    while xx < x + w - 0.3:
        s.line(xx, y + 0.3, xx, y + h - 0.3, (TIMBER, 0.13, None))
        xx += step


def legend(s, x, y, rows, *, dy=6.2):
    """Tegnforklaring med én rad per linje. «stud» tegnes med samme skravur som stenderne i snittet."""
    for kind, label in rows:
        if kind == "stud":
            stud(s, x, y - 2.0, 6.0, 2.4)
            s.text(x + 7.4, y, label, size=T_S, fill=INK2)
        else:
            s.legend_row(x, y, [(kind, label)], size=T_S)
        y += dy
    return y


def build(out_svg):
    s = Sheet()
    s.frame(M.PROJECT["attachment"])
    s.titleblock(title="Stålbjelke B1 ved kjøkkenet – snitt A–A",
                 subtitle="Snitt langs bjelken med opplegg og lastvei til grunnen",
                 drawing_no="E3-2", sheet_no="2 av 3", scale="1:20", rev="–",
                 date=M.PROJECT["date"], project=M.PROJECT["line"], owner=M.PROJECT["owner"], case=M.PROJECT["case"],
                 status="PRINSIPPSKISSE – SOM UTFØRT 2018", author=M.PROJECT["owner"], review=False)
    s.figtitle(22, 21.5, "Snitt A–A langs B1 – bjelken ved kjøkkenet", "1:20", "sett i pilretningen på plan E3-1")

    v = View(s, 20, PX, PY, mx=0.0, my=0.0, flip_y=True)
    X, Y, K = v.X, v.Y, v.k

    def RR(x1, z1, x2, z2):
        return (X(min(x1, x2)), Y(max(z1, z2)), abs(x2 - x1) * K, abs(z2 - z1) * K)

    def open_bottom(xa, xb, marks=None):
        """Brutt nederst: fjern underkanten og tegn bruddlinje med ett bruddmerke (sikksakk) i hver x i marks."""
        y, z = Y(Z_BOT), 1.4
        s.line(X(xa) + 0.2, y, X(xb) - 0.2, y, (PAPER, 0.9, None))
        pts = [(X(xa) - 1.5, y)]
        for xm in (marks or [(xa + xb) / 2]):
            m = X(xm)
            pts += [(m - z, y), (m - 0.3 * z, y + z), (m + 0.3 * z, y - z), (m + z, y)]
        pts.append((X(xb) + 1.5, y))
        s.poly(pts, "thin")

    # ---------------------------------------------------------------- terreng i krypkjelleren
    s.ground(X(-0.62), X(3.92), Y(Z_GROUND))

    # ---------------------------------------------------------------- bak snittet: pipe og tømmervegg
    # pipa står bak snittet og fortsetter ned under gulvet; der dekkes den delvis av stålbjelken og betongklossen
    s.brick_elev(*RR(X_CHIM[0], Z_BOT, X_CHIM[1], Z_TOP))
    s.breakline(X(X_CHIM[0]) - 1.5, Y(Z_TOP), X(X_CHIM[1]) + 1.5, Y(Z_TOP))
    s.logwall(*RR(X_LOGWALL[0], 0.0, X_LOGWALL[1], Z_TOP), n=18)
    s.breakline(X(X_LOGWALL[0]) - 1.5, Y(Z_TOP), X(X_LOGWALL[1]) + 1.5, Y(Z_TOP))

    # ---------------------------------------------------------------- under gulvet
    s.concrete(*RR(X_BLOCK[0], Z_BOT, X_BLOCK[1], Z_OLDB))                       # støpt betongkloss
    # felles bruddlinje under pipe og kloss, med ett bruddmerke i hver del (til side for senterlinjen i x = 0)
    open_bottom(X_CHIM[0], X_BLOCK[1], marks=[(X_CHIM[0] + X_BLOCK[0]) / 2, X_BLOCK[1] / 2])
    s.concrete(*RR(X_FOUND[0], Z_BOT, X_FOUND[1], -0.148))                       # gammel grunnmur
    open_bottom(*X_FOUND)
    # eldre stålbjelke i krypkjelleren, rett under B1
    s.ibeam_side(*RR(X_OLD[0], Z_OLDB, X_OLD[1], Z_J1B), tf=0.0113 * K, label="eldre stålbjelke i krypkjelleren", size=T_S)
    # gulvbjelker 48 x 198 (snittet) og gulv i 1. etasje
    for xj in JOISTS1:
        s.timber_section(*RR(xj - 0.024, Z_J1B, xj + 0.024, Z_J1T))
    s.timber_side(*RR(X_CHIM[1], Z_J1T, X_LOG[0], 0.0), grain=None)
    # tømmerstokk 148 x 148 over grunnmuren
    s.timber_section(*RR(X_LOG[0], -0.148, X_LOG[1], 0.0))

    # ---------------------------------------------------------------- over gulvet: stendere, stålbjelke, gulvbjelker 2. etasje
    stud(s, *RR(-0.049, 0.0, 0.049, H_STUD))                                                  # 2 x 48 x 98 ved pipa
    stud(s, *RR(X_LOG[0], 0.0, X_LOG[1], H_STUD))                                            # 2 x 48 x 148 ved tømmerveggen
    s.ibeam_side(*RR(-0.049, Z_BB, L + 0.049, Z_BT), tf=0.008 * K, label="B1 – IPE 180", size=T_L)
    for xj in JOISTS2:
        s.timber_section(*RR(xj - 0.024, Z_BT, xj + 0.024, Z_BT + J2_H))
    s.timber_side(*RR(X_CHIM[1], Z_BT + J2_H, X_LOGWALL[0], Z_F2), grain=None)

    # ---------------------------------------------------------------- mål
    zL = 1.72
    s.dim((X(0), Y(zL)), (X(L), Y(zL)), 0, "L = 3,63 (senter–senter opplegg)", ext=False, weight=700, text_shift=-34.0)
    for xs in (0.0, L):
        s.line(X(xs), Y(Z_BB) + 0.6, X(xs), Y(zL) + 2.5, CENTER)
    xh = 2.10                                                                   # mellom gulvbjelkene, til side for påskriften på B1
    s.dim((X(xh), Y(0.0)), (X(xh), Y(H_STUD)), 0, "2,07", ext=False, weight=700)
    s.text(X(xh) + 3.0, Y(H_STUD / 2), "stenderhøyde", size=T_XS, fill=INK2, anchor="middle", rot=90)
    # oppleggslengde på stenderne
    lab = "opplegg ca. 0,10"
    sh = 0.049 * K + 2.9 + text_w(lab, T_XS, 600) / 2
    s.dim((X(-0.049), Y(Z_BB)), (X(0.049), Y(Z_BB)), 4.6, lab, size=T_XS, text_off=0.6, weight=600, side=-1, text_shift=sh)
    s.dim((X(L - 0.049), Y(Z_BB)), (X(L + 0.049), Y(Z_BB)), 4.6, lab, size=T_XS, text_off=0.6, weight=600, side=-1,
          text_shift=-sh)
    # betongklossen: 0,90 lang, stenderne står ca. 0,60 inn på den
    yb1 = Y(Z_BOT) + 5.0
    s.dim((X(0.0), yb1), (X(X_BLOCK[1]), yb1), 0, "ca. 0,60", ext=False, size=T_S)
    s.dim((X(X_BLOCK[0]), yb1 + 6.2), (X(X_BLOCK[1]), yb1 + 6.2), 0, "0,90", ext=False, size=T_S)
    for xx in X_BLOCK:
        s.line(X(xx), Y(Z_BOT) + 1.0, X(xx), yb1 + 7.4, (INK, 0.13, None))
    s.line(X(0.0), Y(Z_OLDB) + 0.8, X(0.0), yb1 + 1.2, CENTER)                              # senter stendere
    # grunnmuren
    s.dim((X(X_FOUND[0]), yb1), (X(X_FOUND[1]), yb1), 0, "ca. 0,25", ext=False, size=T_XS, halo=False)
    for xx in X_FOUND:
        s.line(X(xx), Y(Z_BOT) + 1.0, X(xx), yb1 + 1.2, (INK, 0.13, None))

    # ---------------------------------------------------------------- påskrifter på delene
    s.text(X((X_CHIM[0] + X_CHIM[1]) / 2) + 0.9, Y(1.20), "teglsteinspipe (ute av bruk)", size=T_S, fill=BRICK,
           anchor="middle", rot=90, halo=1.4, weight=600)
    s.text(X(X_LOGWALL[1]) + 3.6, Y(1.20), "tømmervegg (opprinnelig yttervegg)", size=T_S, fill=TIMBER, anchor="middle",
           rot=90, weight=600)
    s.text(X(0.33), Y((Z_OLDB + Z_GROUND) / 2) + 0.9, "støpt betongkloss", size=T_XS, fill=CONC, anchor="middle", halo=1.4,
           weight=600)
    s.text(X((X_FOUND[0] + X_FOUND[1]) / 2) + 0.9, Y(-0.52), "gammel grunnmur", size=T_XS, fill=CONC, anchor="middle", rot=90,
           halo=1.4, weight=600)

    # ---------------------------------------------------------------- fire påskrifter med ledelinje
    zt = 1.26                                                                    # overkant tekstblokk ved oppleggene
    s.leader((X(0.049), Y(zt - 0.20)), (X(0.049) + 10.0, Y(zt)), "Ved teglsteinspipa",
             ["2 stendere 48 × 98,", "skrudd fast i pipa"])
    s.leader((X(X_LOG[0]), Y(zt - 0.20)), (X(X_LOG[0]) - 10.0, Y(zt)), "Ved tømmerveggen",
             ["2 stendere 48 × 148", "på tømmerstokk 148 × 148", "over gammel grunnmur"], align="right")
    s.leader((X(0.024), Y(Z_J1B + 0.10)), (X(0.049) + 10.0, Y(0.34)), "Under gulvet ved pipa",
             ["gulvbjelke 48 × 198,", "eldre stålbjelke og betongkloss"])
    s.leader((X(JOISTS2[1] + 0.012), Y(Z_BT + 0.085)), (X(1.20), Y(Z_TOP) + 2.6), "Gulvbjelker 2. etasje",
             ["på overflensen (vist i prinsipp)"])

    # ---------------------------------------------------------------- høyre kolonne: tegnforklaring, linjal, merknad
    s.text(COL_X, COL_Y, "Tegnforklaring", size=T_M, weight=700)
    yy = COL_Y + 7.5
    yy = legend(s, COL_X, yy, (("steel", "Stål"), ("stud", "Stendere fra 2018"), ("timber", "Annet treverk"),
                               ("conc", "Betong"), ("brick", "Tegl")))
    s.scalebar(COL_X, yy + 6.0, K, meters=(0, 0.5, 1), sub=0.1)
    s.mtext(COL_X, yy + 21.0, ["Mål i meter, tverrsnitt i mm.", "Mål merket «ca.» er omtrentlige."], size=T_S,
            fill=INK2)

    s.save(out_svg)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "E3-2.svg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out)
    print("skrev", out)
