"""kort3.py – Ark 3 av 3 (E3-3): snitt B–B langs stålbjelke B2 i gangen, 1:20.

Forenklet prinsippskisse: bjelken, de to oppleggene, det som ligger under gulvet ved betongsøylen og det som
ligger på bjelken. Geometrien er den samme som i det detaljerte arket (sheet3.py). Laster, beregning,
prinsippsnitt og detaljutsnitt er ikke med her.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403
import model as M              # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- geometri i snittet (m). x fra oppleggssenter ved tømmerveggen mot betongsøylen; z opp fra overkant gulv 1. etasje ----
L = 3.40
H_STUD = 2.22                               # stenderhøyde: underkant stendere – underkant stålbjelke
Z_BB, Z_BT = H_STUD, H_STUD + 0.18          # stålbjelke under-/overkant
J2_H, BOARD2 = 0.148, 0.037                 # bjelkelag og gulv i 2. etasje
Z_F2 = Z_BT + J2_H + BOARD2                 # overkant gulv 2. etasje / taktro under terrassen
Z_TERR = Z_F2 + 0.064                       # overkant terrassebord
Z_TOP = Z_F2 + 0.36                         # bruddlinje i tømmervegg og gavlvegg
BOARD1, J1_H = 0.022, 0.196                 # gulvbord og gulvbjelker 48 x 196 i 1. etasje
Z_J1T, Z_J1B = -BOARD1, -BOARD1 - J1_H
Z_COLT = Z_J1B                              # overkant betongsøyle = underkant gulvbjelke (U-beslaget står i søyletoppen)
Z_FT = -0.680                               # overkant betongfundament (tegnet enkelt, ikke målsatt)
Z_GROUND = -0.800                           # terreng i krypkjelleren (tegnet enkelt, ikke målsatt)
Z_BOT = -0.905                              # bruddlinje nederst
X_FOUND = (-0.150, 0.100)                   # gammel grunnmur
X_LOG = (-0.099, 0.049)                     # stendere 48 x 148 og tømmerstokk 148 x 148
X_LOGWALL = (-0.132, 0.082)                 # tømmerveggen bak snittet
X_COL = (3.300, 3.500)                      # betongsøyle Ø ca. 200
X_FOOT = (3.120, 3.680)                     # betongfundament (bredden er ikke målt)
JOISTS1 = [0.4, 1.0, 1.6, 2.2, 2.8, 3.4]
X_VEKSEL = (X_LOGWALL[1], M.X_FLOOR[1])     # vekselbjelken ved trappeåpningen, på overflensen
X_GABLE, GABLE_T = M.X_GABLE, 0.18          # gavlvegg i 2. etasje (og opprinnelig hjørnestolpe under den)
X_TJ = M.X_JOISTS                           # de to takbjelkene under takterrassen som ligger på B2
X_END = 3.62                                # bruddlinje mot resten av gulvet og takterrassen
SKO_H = 0.100                               # søyleskoens sider (tegnet enkelt)
POST_B = 0.100                              # opprinnelig hjørnestolpe, fjernet 2018 (tegnet enkelt)
KUB_H = 0.098                               # kubbingene ved gulvbjelken (tegnet enkelt)

# ---- plassering på arket (mm) ----
PX, PY = 72.0, 186.0                        # papirpunktet for x = 0, z = 0 (overkant gulv 1. etasje)
COL_X = 333.3                               # høyre kolonne: tegnforklaring, målestokklinjal, merknad
COL_Y = 57.0

CENTER = (INK2, 0.13, "3 0.8 0.5 0.8")      # senterlinje


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
    s.titleblock(title="Stålbjelke B2 i gangen – snitt B–B",
                 subtitle="Snitt langs bjelken med opplegg og lastvei til grunnen",
                 drawing_no="E3-3", sheet_no="3 av 3", scale="1:20", rev="–",
                 date=M.PROJECT["date"], project=M.PROJECT["line"], owner=M.PROJECT["owner"], case=M.PROJECT["case"],
                 status="PRINSIPPSKISSE – SOM UTFØRT 2018", author=M.PROJECT["owner"], review=False)
    s.figtitle(22, 21.5, "Snitt B–B langs B2 – bjelken i gangen", "1:20", "sett i pilretningen på plan E3-1")

    v = View(s, 20, PX, PY, mx=0.0, my=0.0, flip_y=True)
    X, Y, K = v.X, v.Y, v.k

    def RR(x1, z1, x2, z2):
        return (X(min(x1, x2)), Y(max(z1, z2)), abs(x2 - x1) * K, abs(z2 - z1) * K)

    def open_bottom(xa, xb):
        """Brutt nederst: fjern underkanten og tegn bruddlinje med ett bruddmerke (sikksakk) på midten."""
        y, z, m = Y(Z_BOT), 1.4, X((xa + xb) / 2)
        s.line(X(xa) + 0.2, y, X(xb) - 0.2, y, (PAPER, 0.9, None))
        s.poly([(X(xa) - 1.5, y), (m - z, y), (m - 0.3 * z, y + z), (m + 0.3 * z, y - z), (m + z, y), (X(xb) + 1.5, y)],
               "thin")

    def blue_section(xj):
        """Takbjelke under takterrassen, snittet (blå som på planen)."""
        x, y, w, h = RR(xj - 0.024, Z_BT, xj + 0.024, Z_BT + J2_H)
        s.rect(x, y, w, h, (BLUE, 0.4, None), fill=BLUE_F)
        s.line(x, y, x + w, y + h, (BLUE, 0.13, None))
        s.line(x + w, y, x, y + h, (BLUE, 0.13, None))

    # ---------------------------------------------------------------- terreng i krypkjelleren
    s.ground(X(-0.45), X(3.82), Y(Z_GROUND))

    # ---------------------------------------------------------------- bak snittet: tømmerveggen
    s.logwall(*RR(X_LOGWALL[0], 0.0, X_LOGWALL[1], Z_TOP), n=19)
    s.breakline(X(X_LOGWALL[0]) - 1.5, Y(Z_TOP), X(X_LOGWALL[1]) + 1.5, Y(Z_TOP))

    # ---------------------------------------------------------------- under gulvet
    s.concrete(*RR(X_FOUND[0], Z_BOT, X_FOUND[1], -0.148))                       # gammel grunnmur
    open_bottom(*X_FOUND)
    s.concrete(*RR(X_FOOT[0], Z_BOT, X_FOOT[1], Z_FT))                           # betongfundament
    open_bottom(*X_FOOT)
    s.concrete(*RR(X_COL[0], Z_FT, X_COL[1], Z_COLT))                            # betongsøyle Ø ca. 200
    # gulvbjelker 48 x 196 (snittet) og gulv i 1. etasje
    for xj in JOISTS1:
        s.timber_section(*RR(xj - 0.024, Z_J1B, xj + 0.024, Z_J1T))
    for xk in (L - 0.048, L + 0.048):                                            # kubbinger på hver side av gulvbjelken
        s.timber_side(*RR(xk - 0.024, Z_J1T - KUB_H, xk + 0.024, Z_J1T), grain=None)
    # innstøpt søylesko (U-beslag) rundt nedre del av gulvbjelken, rett i toppen av betongsøylen
    xa, xb, yu = X(L - 0.024) - 0.3, X(L + 0.024) + 0.3, Y(Z_J1B) + 0.3
    s.poly([(xa, Y(Z_J1B + SKO_H)), (xa, yu), (xb, yu), (xb, Y(Z_J1B + SKO_H))], (STEEL, 0.6, None))
    s.timber_side(*RR(X_LOG[1], Z_J1T, X_END, 0.0), grain=None)
    s.breakline(X(X_END), Y(0.0) - 3.0, X(X_END), Y(Z_J1T) + 1.5)
    # tømmerstokk 148 x 148 over grunnmuren
    s.timber_section(*RR(X_LOG[0], -0.148, X_LOG[1], 0.0))

    # ---------------------------------------------------------------- over gulvet: stendere, hjørnestolpe, stålbjelke
    stud(s, *RR(X_LOG[0], 0.0, X_LOG[1], H_STUD))                                            # 2 x 48 x 148 ved tømmerveggen
    stud(s, *RR(L - 0.049, 0.0, L + 0.049, H_STUD))                                          # 2 x 48 x 98 ved betongsøylen
    # opprinnelig hjørnestolpe under gavlveggen – fjernet 2018
    s.rect(*RR(X_GABLE - POST_B / 2, 0.0, X_GABLE + POST_B / 2, H_STUD), "removed", fill="#fdf1f0", opacity=0.6)
    xg, yg = X(X_GABLE), Y(1.40)
    s.line(xg - 2.2, yg - 2.2, xg + 2.2, yg + 2.2, (RED, 0.4, None))
    s.line(xg - 2.2, yg + 2.2, xg + 2.2, yg - 2.2, (RED, 0.4, None))
    s.ibeam_side(*RR(-0.049, Z_BB, L + 0.049, Z_BT), tf=0.008 * K, label="B2 – IPE 180", size=T_L)

    # ---------------------------------------------------------------- på bjelken: veksel og gulv, gavlvegg, takterrasse
    s.timber_side(*RR(X_VEKSEL[0], Z_BT, X_VEKSEL[1], Z_BT + J2_H), grain="h", n=2)          # vekselbjelken, sett fra siden
    s.timber_side(*RR(X_VEKSEL[0], Z_BT + J2_H, X_GABLE - GABLE_T / 2, Z_F2), grain=None)    # gulvet mot badet
    s.timber_side(*RR(X_GABLE - GABLE_T / 2, Z_BT, X_GABLE + GABLE_T / 2, Z_TOP), grain="v", n=2,
                  style=(ABOVE, 0.35, None))                                                 # gavlvegg i 2. etasje
    s.breakline(X(X_GABLE - GABLE_T / 2) - 1.5, Y(Z_TOP), X(X_GABLE + GABLE_T / 2) + 1.5, Y(Z_TOP))
    for xj in X_TJ:
        blue_section(xj)
    s.rect(*RR(X_GABLE + GABLE_T / 2, Z_BT + J2_H, X_END, Z_F2), (BLUE, 0.25, None), fill=BLUE_F)        # taktro og tekking
    xx = X_GABLE + GABLE_T / 2 + 0.25
    while xx < X_END - 0.05:
        s.rect(*RR(xx, Z_F2, xx + 0.036, Z_F2 + 0.036), (BLUE, 0.15, None), fill="#f1f6fb")
        xx += 0.30
    s.rect(*RR(X_GABLE + GABLE_T / 2 + 0.15, Z_F2 + 0.036, X_END, Z_TERR), (BLUE, 0.2, None), fill="#f1f6fb")  # terrassebord
    s.breakline(X(X_END), Y(Z_TERR) - 2.5, X(X_END), Y(Z_BT + J2_H) + 2.0)

    # ---------------------------------------------------------------- mål
    # målkjede langs B2: tømmerveggen – gavlveggen – takbjelke – takbjelke – opplegget ved betongsøylen
    zc, zL = 2.11, 1.80
    chain = [0.0, X_GABLE, X_TJ[0], X_TJ[1], L]
    w25 = text_w("ca. 0,25", T_XS, 500)
    out = (L + 0.049 - (X_TJ[1] + L) / 2) * K + 1.5 + w25 / 2                   # siste mål skrives utenfor stenderne
    for xa_, xb_, lab, sh in zip(chain, chain[1:], ("ca. 2,25", "ca. 0,30", "ca. 0,60", "ca. 0,25"), (-10.0, 0.8, 0, out)):
        s.dim((X(xa_), Y(zc)), (X(xb_), Y(zc)), 0, lab, ext=False, size=T_XS, text_off=0.7, text_shift=sh, halo=False)
    s.line(X(L), Y(zc), X(L + 0.049) + 1.5 + w25 + 0.6, Y(zc), "dim")
    for xr in chain[1:-1]:
        s.line(X(xr), Y(Z_BT), X(xr), Y(zc) + 1.2, CENTER)
    # oppleggslengde på stenderne
    lab = "opplegg ca. 0,10"
    sh = 0.049 * K + 2.9 + text_w(lab, T_XS, 600) / 2
    s.dim((X(-0.049), Y(Z_BB)), (X(0.049), Y(Z_BB)), 11.0, lab, size=T_XS, text_off=0.6, weight=600, side=-1, text_shift=sh)
    s.dim((X(L - 0.049), Y(Z_BB)), (X(L + 0.049), Y(Z_BB)), 11.0, lab, size=T_XS, text_off=0.6, weight=600, side=-1,
          text_shift=-sh)
    # spenn og høyde
    s.dim((X(0), Y(zL)), (X(L), Y(zL)), 0, "L = 3,40 (senter–senter opplegg)", ext=False, weight=700, text_shift=-52.0)
    for xs in (0.0, L):
        s.line(X(xs), Y(Z_BB) + 0.6, X(xs), Y(zL) + 2.5, CENTER)
    xh = 1.30                                                                   # mellom gulvbjelkene, til side for påskriftene
    s.dim((X(xh), Y(0.0)), (X(xh), Y(H_STUD)), 0, "2,22", ext=False, weight=700)
    s.text(X(xh) + 3.0, Y(H_STUD / 2), "stenderhøyde", size=T_XS, fill=INK2, anchor="middle", rot=90)
    # grunnmuren
    yb1 = Y(Z_BOT) + 5.0
    s.dim((X(X_FOUND[0]), yb1), (X(X_FOUND[1]), yb1), 0, "ca. 0,25", ext=False, size=T_XS, halo=False)
    for xx in X_FOUND:
        s.line(X(xx), Y(Z_BOT) + 1.0, X(xx), yb1 + 1.2, (INK, 0.13, None))

    # ---------------------------------------------------------------- påskrifter på delene
    s.text(X(X_LOGWALL[0]) - 2.2, Y(1.20), "tømmervegg (opprinnelig yttervegg)", size=T_S, fill=TIMBER, anchor="middle",
           rot=90, weight=600)
    s.text(X((X_FOUND[0] + X_FOUND[1]) / 2) + 0.9, Y(-0.52), "gammel grunnmur", size=T_XS, fill=CONC, anchor="middle", rot=90,
           halo=1.4, weight=600)
    s.text(X((X_GABLE + GABLE_T / 2 + X_END) / 2), Y(Z_TERR) - 2.2, "takterrasse", size=T_S, fill=BLUE, anchor="middle",
           weight=600)

    # ---------------------------------------------------------------- påskrifter med ledelinje: oppleggene
    zt = 1.26                                                                    # overkant tekstblokk ved oppleggene
    s.leader((X(X_LOG[1]), Y(zt - 0.20)), (X(X_LOG[1]) + 10.0, Y(zt)), "Ved tømmerveggen",
             ["2 stendere 48 × 148", "på tømmerstokk 148 × 148", "over gammel grunnmur"])
    s.leader((X(L - 0.049), Y(zt - 0.20)), (X(L - 0.049) - 10.0, Y(zt)), "Ved betongsøylen",
             ["2 stendere 48 × 98", "rett over betongsøylen"], align="right")
    s.leader((X(X_GABLE + POST_B / 2), Y(0.52)), (X(X_GABLE + POST_B / 2) + 7.0, Y(0.66)), "Hjørnestolpe",
             ["fjernet 2018"], color=RED, line_fill=RED, dot=False)

    # ---------------------------------------------------------------- påskrifter med ledelinje: på bjelken
    yt = Y(Z_TOP) + 2.6
    s.leader((X(1.40), Y(Z_BT + 0.075)), (X(1.15), yt), "Vekselbjelke ved trappeåpningen",
             ["og gulvet mot badet"], align="right")
    s.leader((X(X_GABLE - GABLE_T / 2), yt + T_M * 0.62 + 1.0), (X(X_GABLE - GABLE_T / 2) - 8.0, yt),
             "Gavlvegg i 2. etasje", align="right", color=ABOVE)

    # ---------------------------------------------------------------- påskrifter til høyre for snittet (vannrett ledelinje)
    rx = X(3.82) + 5.0

    def right(x, z, title, lines=(), **kw):
        s.leader((X(x), Y(z)), (rx, Y(z) - T_M * 0.62), title, lines, **kw)

    zj = Z_BT + J2_H / 2
    right(X_TJ[0], zj, "Takbjelker under takterrassen", color=BLUE)
    s.circle(X(X_TJ[1]), Y(zj), 0.42, None, fill=BLUE)
    right(L + 0.072, -0.065, "Kubbinger")
    right(L + 0.024 + 0.006, Z_J1B + 0.028, "Gulvbjelke 48 × 196", ["i innstøpt søylesko (U-beslag)"])
    right(X_COL[1], -0.47, "Betongsøyle Ø ca. 200")
    right(X_FOOT[1], -0.735, "Betongfundament")

    # ---------------------------------------------------------------- høyre kolonne: tegnforklaring, linjal, merknad
    s.text(COL_X, COL_Y, "Tegnforklaring", size=T_M, weight=700)
    yy = COL_Y + 7.5
    yy = legend(s, COL_X, yy, (("steel", "Stål"), ("stud", "Stendere fra 2018"), ("timber", "Annet treverk"),
                               ("conc", "Betong"), ("removed", "Fjernet 2018")))
    s.scalebar(COL_X, yy + 6.0, K, meters=(0, 0.5, 1), sub=0.1)
    s.mtext(COL_X, yy + 21.0, ["Mål i meter, tverrsnitt i mm.", "Mål merket «ca.» er omtrentlige."], size=T_S,
            fill=INK2)

    s.save(out_svg)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "E3-3.svg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out)
    print("skrev", out)
