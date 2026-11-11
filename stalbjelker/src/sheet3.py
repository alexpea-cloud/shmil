"""sheet3.py – Ark 3: snitt B–B langs B2 (1:20), prinsippsnitt C–C (taksperrenes opplegg),
detalj D2 ved opplegg O4 (1:10) og beregning B2."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403
from calcfig import *          # noqa: E402,F403
import model as M              # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "results.json"), encoding="utf-8"))

# ---- geometri i snittet (m). x fra oppleggssenter O3 (grunnmur) mot O4 (betongsøyle); z opp fra gulv 1. etasje
L = 3.40
H_STUD = 2.22
Z_BB, Z_BT = H_STUD, H_STUD + 0.18
J2_H, BOARD2 = 0.148, 0.037
Z_F2 = Z_BT + J2_H + BOARD2                 # overkant gulv 2. etasje / taktro
Z_TERR = Z_F2 + 0.064                       # overkant terrassebord
BOARD1, J1_H = 0.022, 0.198
Z_J1T, Z_J1B = -BOARD1, -BOARD1 - J1_H
Z_COLT = -0.278                             # overkant betongsøyle
Z_GROUND = -0.800                           # terreng i krypkjeller (ikke målt – vist omtrentlig)
Z_BOT = -0.875                              # bruddlinje: fundament er ikke kjent
X_FOUND = (-0.150, 0.100)
X_LOG = (-0.099, 0.049)
X_LOGWALL = (-0.132, 0.082)
X_COL = (3.300, 3.500)
JOISTS1 = [0.4, 1.0, 1.6, 2.2, 2.8, 3.4]
X_GABLE = 2.25
GABLE_T = 0.18
X_TJ = (2.55, 3.15)
X_END = 3.62                                # bruddlinje mot resten av terrassen


def build(out_svg):
    s = Sheet()
    s.frame(M.PROJECT["attachment"])
    tb = s.titleblock(title="Stålbjelke B2 – snitt B–B og opplegg",
                      subtitle="Snitt langs gangbjelken B2, taksperrenes opplegg (C–C), detalj ved O4 og beregningssammendrag",
                      drawing_no="S-03", sheet_no="3 av 3", scale="1:20 / 1:10", rev=M.PROJECT["rev"],
                      date=M.PROJECT["date"], project=M.PROJECT["line"], owner=M.PROJECT["owner"], case=M.PROJECT["case"])
    s.revtable(tb[0], tb[1], tb[2], M.REV_ROWS)
    s.figtitle(22, 21.5, "Snitt B–B langs B2 – gangbjelke", "1:20", "sett i pilretningen på plan S-01 · mål i meter, tverrsnitt i mm")

    v = View(s, 20, 41.0, 186.0, mx=0.0, my=0.0, flip_y=True)
    X, Y, K = v.X, v.Y, v.k

    def RR(x1, z1, x2, z2):
        return (X(min(x1, x2)), Y(max(z1, z2)), abs(x2 - x1) * K, abs(z2 - z1) * K)

    r2 = R["B2"]
    r2t = R["B2_terrace"]
    rob = R["robust"]
    res = R["section"]
    sup = R["supports"]
    z_cut = Z_F2 + 0.36                      # bruddlinje i gavlvegg / tømmervegg

    # ---------------------------------------------------------------- bakgrunn: tømmervegg
    s.logwall(*RR(X_LOGWALL[0], 0.0, X_LOGWALL[1], z_cut), n=19)
    s.breakline(X(X_LOGWALL[0]) - 1.5, Y(z_cut), X(X_LOGWALL[1]) + 1.5, Y(z_cut))

    # ---------------------------------------------------------------- under gulv
    s.ground(X(-0.42), X(X_END + 0.05), Y(Z_GROUND))
    for (xa, xb, zt_) in ((X_FOUND[0], X_FOUND[1], -0.148), (X_COL[0], X_COL[1], Z_COLT)):
        s.concrete(*RR(xa, Z_BOT, xb, zt_))
        s.line(X(xa) + 0.2, Y(Z_BOT), X(xb) - 0.2, Y(Z_BOT), (PAPER, 0.9, None))      # åpen bunn: fundament ikke kjent
        s.breakline(X(xa) - 1.5, Y(Z_BOT), X(xb) + 1.5, Y(Z_BOT))
    for xj in JOISTS1:
        s.timber_section(*RR(xj - 0.024, Z_J1B, xj + 0.024, Z_J1T))
    # sidekubbinger ved O4
    for xk in (3.4 - 0.048, 3.4 + 0.048):
        s.rect(*RR(xk - 0.024, Z_J1B, xk + 0.024, Z_J1T), (TIMBER, 0.25, "1.2 0.7"), fill=TIMBER_F)
    s.timber_side(*RR(X_LOG[1], Z_J1T, X_END, 0.0), grain=None)
    s.timber_section(*RR(X_LOG[0], -0.148, X_LOG[1], 0.0))
    # stålplate (opplyst, 400 mm) og stolpesko – skjematisk og stiplet: type, plassering og feste er ikke kjent
    s.rect(*RR(3.4 - 0.10, Z_J1B - 0.008, 3.4 + 0.10, Z_J1B), (STEEL, 0.25, "1.2 0.7"), fill="#eef3f8")
    s.rect(*RR(3.4 - 0.06, Z_COLT, 3.4 + 0.06, Z_J1B - 0.008), (STEEL, 0.25, "1.2 0.7"), fill="#eef3f8")

    # ---------------------------------------------------------------- over gulv
    s.timber_side(*RR(X_LOG[0], 0.0, X_LOG[1], H_STUD), grain="v", new=True, n=5)             # O3: 2 x 48x148
    s.timber_side(*RR(L - 0.049, 0.0, L + 0.049, H_STUD), grain="v", new=True, n=3)           # O4: 2 x 48x98
    # opprinnelig hjørnestolpe (fjernet 2018) – stiplet
    s.rect(*RR(X_GABLE - 0.06, 0.0, X_GABLE + 0.06, H_STUD), "removed", fill="#fdf1f0", opacity=0.6)
    xg, yg = X(X_GABLE), Y(1.58)
    s.line(xg - 2.2, yg - 2.2, xg + 2.2, yg + 2.2, (RED, 0.4, None))
    s.line(xg - 2.2, yg + 2.2, xg + 2.2, yg - 2.2, (RED, 0.4, None))
    # stålbjelke
    s.ibeam_side(*RR(-0.049, Z_BB, L + 0.049, Z_BT), tf=0.008 * K, label="B2 – IPE 180 (montert 2018)", size=T_L)
    # trappeveksling (ligger langs B2 på overflensen) og gulv 2. etg.
    s.timber_side(*RR(X_LOGWALL[1], Z_BT, 2.075, Z_BT + J2_H), grain="h", n=2)
    s.timber_side(*RR(X_LOGWALL[1], Z_BT + J2_H, X_GABLE - GABLE_T / 2, Z_F2), grain=None)
    # gavlvegg 2. etg. (snittet). Hva veggen står på over B2, er ikke dokumentert – vist stiplet
    s.rect(*RR(X_GABLE - 0.024, Z_BT, X_GABLE + 0.024, Z_BT + J2_H), (TIMBER, 0.3, "1.2 0.7"), fill=PAPER)
    s.timber_side(*RR(X_GABLE - GABLE_T / 2, Z_BT + J2_H, X_GABLE + GABLE_T / 2, z_cut), grain="v", n=2,
                  style=(ABOVE, 0.35, None))
    s.breakline(X(X_GABLE - GABLE_T / 2) - 1.5, Y(z_cut), X(X_GABLE + GABLE_T / 2) + 1.5, Y(z_cut))
    # takterrasse: takbjelker, taktro/tekking, terrassebord
    for xj in X_TJ:
        s.timber_section(*RR(xj - 0.024, Z_BT, xj + 0.024, Z_BT + J2_H))
    s.rect(*RR(X_GABLE + GABLE_T / 2, Z_BT + J2_H, X_END, Z_F2), (BLUE, 0.25, None), fill=BLUE_F)
    s.rect(*RR(X_GABLE + GABLE_T / 2 + 0.15, Z_F2 + 0.036, X_END, Z_TERR), (BLUE, 0.2, None), fill="#f1f6fb")
    xx = X_GABLE + GABLE_T / 2 + 0.25
    while xx < X_END - 0.05:
        s.rect(*RR(xx, Z_F2, xx + 0.036, Z_F2 + 0.036), (BLUE, 0.15, None), fill="#f1f6fb")
        xx += 0.30
    s.breakline(X(X_END), Y(Z_TERR) - 2.5, X(X_END), Y(Z_BT) + 1.5)
    s.breakline(X(X_END), Y(0.0) - 1.5, X(X_END), Y(Z_J1B) + 1.5)

    # ---------------------------------------------------------------- laster
    f = r2["design_loads"]
    w_floor = next(d["Ed"] for d in f if d["type"] == "udl" and abs(d["x1"] - 0.10) < 1e-6)
    p_stair = next(d["Ed"] for d in f if d["type"] == "pt" and abs(d["x1"] - 1.20) < 1e-6)
    p_gable = next(d["Ed"] for d in f if d["type"] == "pt" and abs(d["x1"] - 2.25) < 1e-6)
    p_joist = next(d["Ed"] for d in f if d["type"] == "pt" and abs(d["x1"] - 2.55) < 1e-6)
    w_self = next(d["Ed"] for d in f if d["type"] == "udl" and d["x1"] == 0.0)
    y_ld = Y(Z_F2 + 0.24)
    s.udl(X(0.10), X(2.10), y_ld, Y(Z_F2) - 0.8, n=9)
    s.text(X(0.13), y_ld - 1.2, f"gulv via trappeveksling: {num(w_floor)} kN/m", size=T_S, weight=500)
    s.pload(X(1.20), y_ld - 7.0, Y(Z_F2) - 0.8, None, size=T_XS)
    s.text(X(1.20) + 1.6, y_ld - 5.0, f"trapp {num(p_stair, 1)} kN", size=T_XS, weight=600)
    s.pload(X(X_GABLE), Y(z_cut) - 9.0, Y(z_cut) - 1.8, None, color=ABOVE, size=T_XS)
    s.text(X(X_GABLE) - 1.6, Y(z_cut) - 5.6, f"gavlvegg {num(p_gable, 2)} kN", size=T_XS, weight=600, fill=ABOVE, anchor="end")
    # snøfonn over terrassen (prinsipp): 7,44 ved veggen, avtar lineært over ls = 7,44 m
    sn = R["snow"]
    xs0, xs1 = X_GABLE + GABLE_T / 2, X_END
    zs = Z_TERR + 0.10
    hs = 0.30                                # tegnet høyde for 7,44 kN/m2
    s1 = sn["peak"] - (sn["peak"] - sn["base"]) * (xs1 - xs0) / sn["ls"]
    snow_pts = [(X(xs0), Y(zs)), (X(xs0), Y(zs + hs)), (X(xs1), Y(zs + hs * s1 / sn["peak"])), (X(xs1), Y(zs))]
    s.poly(snow_pts, None, fill="#f3f8fd", close=True)
    s.dots_poly(snow_pts)
    s.poly(snow_pts, (BLUE, 0.25, None), fill="none", close=True)
    s.text(X(xs0) + 0.5, Y(zs + hs) - 1.4, f"snøfonn: 2,0 kN/m³ × 3,72 m = {num(sn['peak'])} kN/m² ved veggen", size=T_XS,
           fill=BLUE, weight=600)
    s.text(X(2.85), Y(zs + 0.215), "lastfigur – ikke snødybde", size=T_XS, fill=BLUE, anchor="middle", halo=1.6)
    for xj in X_TJ:
        s.arrow(X(xj), Y(zs) - 0.0, X(xj), Y(Z_TERR) - 0.6, color=BLUE, lw=0.4, head=2.0)
    s.text(X(2.85), Y(zs + 0.105), f"{num(p_joist, 1)} kN per takbjelke", size=T_XS, fill=BLUE, weight=700, anchor="middle",
           halo=1.6)
    # oppleggskrefter
    for xs, lab, anc in ((0.0, f"R_{{Ed}} = {num(r2['RA'], 1)} kN", "start"), (L, f"R_{{Ed}} = {num(r2['RB'], 1)} kN", "end")):
        s.arrow(X(xs), Y(1.50), X(xs), Y(1.20), color=RED, lw=0.45, head=2.4)
        dxl = 4.4 if anc == "start" else -4.4
        s.text(X(xs) + dxl, Y(1.35) + 0.9, lab, size=T_XS, weight=700, fill=RED, anchor=anc)

    # ---------------------------------------------------------------- målsetting
    zL = 1.78
    s.dim((X(0), Y(zL)), (X(L), Y(zL)), 0, "L = 3,40 (senter–senter opplegg)", ext=False, weight=700, text_shift=-37.5)
    for xs in (0.0, L):
        s.line(X(xs), Y(Z_BB) + 0.6, X(xs), Y(zL) + 2.5, (INK2, 0.13, "3 0.8 0.5 0.8"))
    s.dim((X(1.60), Y(0.0)), (X(1.60), Y(H_STUD)), 0, "2,22", ext=False, weight=700)
    s.text(X(1.60) - 2.2, Y(0.92) - 1.2, "underkant stendere –", size=T_XS, fill=INK2, anchor="end")
    s.text(X(1.60) - 2.2, Y(0.92) + 2.0, "underkant stålbjelke", size=T_XS, fill=INK2, anchor="end")
    s.dim((X(-0.049), Y(Z_BB)), (X(0.049), Y(Z_BB)), 4.6, "ca. 98", size=T_XS, text_off=0.6, weight=600, side=-1,
          text_shift=8.6)
    s.dim((X(L - 0.049), Y(Z_BB)), (X(L + 0.049), Y(Z_BB)), 4.6, "ca. 98", size=T_XS, text_off=0.6, weight=600, side=-1,
          text_shift=-8.6)
    # kjede i bunn: O3 – tidligere hjørnestolpe – O4
    yb1 = Y(Z_BOT) + 5.5
    s.dim((X(0.0), yb1), (X(X_GABLE), yb1), 0, "ca. 2,25", ext=False, color=RED)
    s.dim((X(X_GABLE), yb1), (X(L), yb1), 0, "ca. 1,15", ext=False, color=RED)
    for xx_ in (0.0, L):
        s.line(X(xx_), Y(Z_BOT) + 1.0, X(xx_), yb1 + 1.2, (INK, 0.13, None))
    s.line(X(X_GABLE), Y(0.0) + 0.8, X(X_GABLE), Y(Z_GROUND) - 4.6, (RED, 0.13, "2 1"))      # fri av krypkjellerteksten
    s.line(X(X_GABLE), Y(Z_GROUND) + 0.4, X(X_GABLE), yb1 + 1.2, (RED, 0.13, "2 1"))
    s.text(X(0.0), yb1 + 5.2, "O3 · grunnmur", size=T_XS, fill=INK2, anchor="middle")
    s.text(X(X_GABLE), yb1 + 5.2, "opprinnelig hjørnestolpe (fjernet 2018)", size=T_XS, fill=RED, anchor="middle")
    s.text(X(L), yb1 + 5.2, "O4 · betongsøyle", size=T_XS, fill=INK2, anchor="middle")
    s.scalebar(X(0.36), yb1 + 2.4, K, meters=(0, 0.5, 1), sub=0.1)
    s.text(X(0.36), yb1 + 9.2, "Målestokk gjelder ved utskrift i A3.", size=T_XS, fill=INK2)

    # ---------------------------------------------------------------- tekst i snittet
    s.leader((X(X_LOG[1]), Y(0.62)), (X(X_LOG[1]) + 9.0, Y(0.72)), "O3 – opplegg mot grunnmuren",
             ["2 stendere 48 × 148 i døråpningen i", "tømmerveggen: oppleggslengde ca. 98 mm", "+ 50 mm inn i veggen. Står på tømmer-",
              "stokk 148 × 148 rett over grunnmuren", "(ca. 0,25 m)."], size=T_XS, tsize=T_S)
    s.leader((X(L - 0.049), Y(0.62)), (X(L - 0.049) - 6.0, Y(0.72)), "O4 – opplegg ved betongsøylen",
             ["2 stendere 48 × 98, sidestøttet", "(utførelse ikke kontrollert).", "Videre: gulvbjelke 48 × 198 med",
              "sidekubbinger → stålplate →", "stolpesko → betongsøyle Ø ca. 200.", "Se detalj D2."], size=T_XS, tsize=T_S,
             align="right")
    s.leader((X(X_GABLE + 0.06), Y(1.02)), (X(X_GABLE + 0.06) + 4.0, Y(1.14)), "Opprinnelig hjørnestolpe",
             ["fjernet 2018 – vist stiplet.", "Sto under gavlveggen i 2. etasje."], size=T_XS, tsize=T_XS, color=RED,
             line_fill=INK2, dot=False)
    s.leader((X(1.05), Y(Z_BT + 0.075)), (X(0.30), Y(Z_BB) + 3.4), "Trappeveksling på overflensen",
             ["bærer bjelkelaget fra badsiden –", "holder B2 sideveis (forutsetning).", "Dimensjon ikke målt."], size=T_XS, tsize=T_XS,
             color=TIMBER, line_fill=INK2)
    s.leader((X(X_GABLE - 0.024), Y(Z_BT + 0.074)), (X(1.67), Y(Z_BB) + 3.4), "Under gavlveggen",
             ["underlag ikke", "dokumentert", "(vist stiplet).", "Vegg: skjematisk."], size=T_XS, tsize=T_XS, color=TIMBER,
             line_fill=INK2)
    s.leader((X(X_TJ[0] + 0.024), Y(Z_BT + 0.06)), (X(2.47), Y(Z_BB) + 3.4), "Takbjelker c/c 0,60",
             ["to ligger på B2: x ≈ 2,55 og 3,15", "(0,30 og 0,90 m fra gavlveggen).", "Dimensjon og terrassens opp-",
              "bygning er vist skjematisk."], size=T_XS, tsize=T_XS, color=BLUE, line_fill=INK2)
    s.text(X(X_GABLE) + 0.75, Y(Z_F2 + 0.19), "gavlvegg", size=T_XS, fill=ABOVE, anchor="middle", weight=600, rot=90,
           halo=1.2)
    s.text(X(X_LOGWALL[0]) - 2.4, Y(1.2), "tømmervegg (opprinnelig yttervegg)", size=T_XS, fill=TIMBER, anchor="middle", rot=90,
           weight=600)
    s.text(X((X_FOUND[0] + X_FOUND[1]) / 2), Y(-0.50), "grunnmur", size=T_XS, fill=CONC, anchor="middle", rot=90, halo=1.4,
           weight=600)
    s.text(X((X_COL[0] + X_COL[1]) / 2), Y(-0.57), "betongsøyle", size=T_XS, fill=CONC, anchor="middle", rot=90, halo=1.4,
           weight=600)
    s.text(X(1.62), Y(Z_GROUND) - 1.6, "krypkjeller – høyden er ikke målt, vist omtrentlig. Grunnmur og søyle: fundament ikke kjent.",
           size=T_XS, fill=INK2, anchor="middle", italic=True)
    s.text(X(X_END) - 1.0, Y(Z_TERR) - 1.0, "takterrasse →", size=T_XS, fill=BLUE, weight=600, anchor="end", halo=1.4)
    # detaljmarkering D2
    s.rect(X(3.14), Y(0.24), 0.52 * K, (0.24 + 0.62) * K, (INK2, 0.25, "3 1.2"), rx=2.0)
    s.tag(X(3.14) - 3.6, Y(0.24) + 3.8, "D2", size=T_XS)
    xe = s.legend_row(22.0, 26.8, [("steel", "stål"), ("timber_new", "tre, montert 2018"), ("timber", "tre, alder ikke dokumentert"),
                                   ("conc", "betong"), ("removed", "fjernet 2018"), ("unknown", "ikke dokumentert (skjematisk)"),
                                   ("react", "oppleggskraft")], gap=3.4)
    assert xe < 231.0, xe
    s.text(22.0, 30.3, "B2 og stenderne er fra 2018. Annet treverk, betongsøyle og stolpesko: alder ikke dokumentert.",
           size=T_XS, fill=INK2)

    # ================================================================ høyre kolonne
    cx, cw = 232.0, 176.0

    # ---------------- prinsippsnitt C–C ---------------------------------------------------------
    s.figtitle(cx, 21.5, "Prinsippsnitt C–C", None, None)
    s.text(cx, 26.4, "taksperrenes opplegg · sett i pilretningen på plan · ikke i målestokk", size=T_XS, fill=INK2)
    kc = 15.2
    c0x = cx + 2.0 + 2.35 * kc              # papir-x for B2 (y = 0)
    c0y = 89.5                              # papir-y for z = 1,55 (bruddlinje i 1. etasje)

    def CX(y):
        return c0x + y * kc

    def CY(z):
        return c0y - (z - 1.55) * kc

    def CRc(y1, z1, y2, z2):
        return (CX(min(y1, y2)), CY(max(z1, z2)), abs(y2 - y1) * kc, abs(z2 - z1) * kc)

    zf2 = Z_F2
    zr = zf2 + 2.40                         # innvendig høyde ved tidligere yttervegg (målt 2,40)
    zr_e = zf2 + 1.15                       # ytterveggens topp – ikke målt, vist i prinsipp
    yb, yfw, ye = -1.50, -1.70, 2.45        # badvegg, tidligere yttervegg 2. etg., yttervegg øst
    # 1. etasje: badvegg og yttervegg, brutt i underkant
    s.rect(*CRc(yb - 0.11, 1.55, yb, Z_BT), (WALL, 0.3, None), fill=WALL_F)
    s.rect(*CRc(ye, 1.55, ye + 0.2, zr_e), (WALL, 0.3, None), fill=WALL_F)
    s.breakline(CX(yb - 0.11) - 1.2, CY(1.55), CX(yb) + 1.2, CY(1.55))
    s.breakline(CX(ye) - 1.2, CY(1.55), CX(ye + 0.2) + 1.2, CY(1.55))
    # etasjeskille: bjelkelag fra badsiden til vekslingen på B2; trappeåpning øst for B2
    s.rect(*CRc(-2.35, Z_BT, 0.09, zf2), (TIMBER, 0.25, None), fill=TIMBER_F)
    s.breakline(CX(-2.35), CY(zf2) - 1.2, CX(-2.35), CY(Z_BT) + 1.2)
    s.ibeam_section(CX(0.0), CY(Z_BT), 0.18 * kc, 2.4, 0.5, 0.5)
    s.text(CX(0.0) + 3.0, CY(Z_BB) + 1.2, "B2", size=T_S, weight=700, fill=STEEL)
    s.text(CX(1.27), CY(Z_BT - 0.03), "trappeåpning", size=T_XS, fill=INK3, anchor="middle")
    s.line(CX(0.12), CY(zf2), CX(ye), CY(zf2), (INK3, 0.13, "1.5 1"))
    # 2. etasje: tidligere yttervegg (opplegg for sperrer)
    s.rect(*CRc(yfw - 0.07, zf2, yfw + 0.07, zr), (ABOVE, 0.35, None), fill="#ece6f5")
    # sperre (prinsipp): opplegg på den tidligere ytterveggen og på ytterveggen. Takformen er ikke målt, så sperren
    # er brutt i begge ender og mønet er ikke vist.
    slope = ((zr + 0.11) - (zr_e + 0.02)) / ((yfw - 0.07) - (ye + 0.28))

    def zs_at(y):
        return (zr + 0.11) + slope * (y - (yfw - 0.07))
    y_w, y_e = yfw - 0.42, ye + 0.34
    s.line(CX(y_w), CY(zs_at(y_w)), CX(y_e), CY(zs_at(y_e)), (INK, 0.55, None))
    for yy_ in (y_w, y_e):
        s.breakline(CX(yy_), CY(zs_at(yy_)) - 2.6, CX(yy_), CY(zs_at(yy_)) + 2.6)
    # lastpiler: tak -> tidligere yttervegg og tak -> yttervegg. Videre lastvei ned er ikke kontrollert (?)
    s.arrow(CX(yfw), CY(zr - 0.20), CX(yfw), CY(zf2 + 1.05), color=ABOVE, lw=0.5, head=2.2)
    s.arrow(CX(ye + 0.1), CY(zr_e - 0.12), CX(ye + 0.1), CY(zr_e - 0.72), color=ABOVE, lw=0.5, head=2.2)
    s.text(CX(yfw) - 0.7, CY(Z_BT - 0.225), "?", size=T_L, weight=700, fill=ABOVE, anchor="middle")
    # mål
    yd = CY(zf2 + 0.42)
    s.dim((CX(yfw), yd), (CX(0.0), yd), 0, "1,70", ext=False, size=T_XS, text_off=0.6, color=ABOVE, weight=700)
    s.line(CX(0.0), CY(zf2) - 0.5, CX(0.0), yd - 1.2, (ABOVE, 0.13, "2 1"))
    yd2 = CY(1.86)
    s.dim((CX(yb), yd2), (CX(0.0), yd2), 0, "ca. 1,50", ext=False, size=T_XS, text_off=0.6)
    s.dim((CX(yfw), yd2), (CX(yb), yd2), 0, "", ext=False, color=ABOVE)
    s.text(CX(yfw) - 2.0, yd2 + 0.85, "0,20", size=T_XS, fill=ABOVE, weight=500, anchor="end")
    s.line(CX(yfw), CY(Z_BT - 0.225) + 0.9, CX(yfw), yd2 + 1.0, (ABOVE, 0.13, "2 1"))
    s.line(CX(0.0), CY(Z_BB) + 0.5, CX(0.0), yd2 + 1.0, (INK2, 0.13, "2 1"))
    s.dim((CX(-2.14), CY(zf2)), (CX(-2.14), CY(zr)), 0, "2,40", ext=False, size=T_XS, text_off=0.6)
    # tekster
    tx = CX(yfw) + 2.6
    ty = CY(zf2 + 1.72)
    for i, ln in enumerate(["tidligere yttervegg i", "2. etasje – opplegg", "for taksperrene"]):
        s.text(tx, ty + i * 3.2, ln, size=T_XS, fill=ABOVE, weight=600)
    s.text(CX(1.02), CY(zf2 + 1.02), "taksperrer over trappa", size=T_XS, fill=INK2, anchor="middle")
    s.text(CX(1.02), CY(zf2 + 1.02) + 3.2, "(prinsipp – takform ikke målt,", size=T_XS, fill=INK2, anchor="middle")
    s.text(CX(1.02), CY(zf2 + 1.02) + 6.4, "sperren er brutt i begge ender)", size=T_XS, fill=INK2, anchor="middle")
    s.text(CX(yb - 0.055), CY(1.55) + 4.4, "badvegg", size=T_XS, fill=INK2, anchor="middle")
    s.text(CX(ye + 0.1), CY(1.55) + 4.4, "yttervegg", size=T_XS, fill=INK2, anchor="middle")
    s.text(CX(1.27), CY(zf2 + 0.16), "2. etasje", size=T_XS, fill=INK3, anchor="middle")
    s.text(CX(1.27), CY(1.80), "1. etasje", size=T_XS, fill=INK3, anchor="middle")
    s.mtext(cx, c0y + 9.5, wrap("Etter opplysningene går hovedtaklasten over trappa via den tidligere ytterveggen (1,70 m fra B2, "
                                "0,20 m bak badveggen sett fra B2) og ytterveggen, ikke direkte ned i B2. Lastvei og fundamentering "
                                "er ikke bekreftet (?). Hanebjelker er ikke dokumentert i denne takdelen.",
                                T_XS, 86.0), size=T_XS, fill=INK2)

    # ---------------- detalj D2 ------------------------------------------------------------------
    dx0 = cx + 90.0
    s.figtitle(dx0, 21.5, "Detalj D2 – opplegg O4", "1:10", None)
    s.text(dx0, 26.4, "snitt langs B2, som B–B", size=T_XS, fill=INK2)
    s.scalebar(dx0 + 58.0, 24.4, 100.0, meters=(0, 0.1, 0.2), sub=0.05)
    d = View(s, 10, dx0 + 22.0, 49.5, mx=3.40, my=0.0, flip_y=True)
    DX, DY, DK = d.X, d.Y, d.k

    def DR(x1, z1, x2, z2):
        return (DX(min(x1, x2)), DY(max(z1, z2)), abs(x2 - x1) * DK, abs(z2 - z1) * DK)

    zt, zb = 0.185, -0.50
    s.concrete(*DR(X_COL[0], zb, X_COL[1], Z_COLT))
    s.breakline(DX(X_COL[0]) - 1.5, DY(zb), DX(X_COL[1]) + 1.5, DY(zb))
    # gulvbjelke 48 x 198 (snittet) og sidekubbinger (stiplet – omfang ikke dokumentert)
    s.timber_section(*DR(3.4 - 0.024, Z_J1B, 3.4 + 0.024, Z_J1T))
    for xk in (3.4 - 0.048, 3.4 + 0.048):
        s.rect(*DR(xk - 0.024, Z_J1B, xk + 0.024, Z_J1T), (TIMBER, 0.3, "1.6 0.9"), fill=TIMBER_F)
    s.timber_side(*DR(3.4 - 0.16, Z_J1T, 3.4 + 0.16, 0.0), grain=None)
    for xe in (3.4 - 0.16, 3.4 + 0.16):
        s.breakline(DX(xe), DY(0.012), DX(xe), DY(Z_J1T - 0.012))
    # stålplate (opplyst, 400 mm) og stolpesko – skjematisk og stiplet: type, plassering og feste er ikke kjent
    s.rect(*DR(3.4 - 0.10, Z_J1B - 0.008, 3.4 + 0.10, Z_J1B), (STEEL, 0.3, "1.4 0.8"), fill="#eef3f8")
    s.rect(*DR(3.4 - 0.06, Z_COLT, 3.4 + 0.06, Z_J1B - 0.008), (STEEL, 0.3, "1.4 0.8"), fill="#eef3f8")
    s.text(DX(3.4), DY((Z_COLT + Z_J1B - 0.008) / 2) + 1.0, "?", size=T_M, weight=700, fill=STEEL, anchor="middle")
    # stendere
    s.timber_side(*DR(3.4 - 0.049, 0.0, 3.4 + 0.049, zt), grain="v", new=True, n=3)
    s.breakline(DX(3.4 - 0.049) - 1.5, DY(zt), DX(3.4 + 0.049) + 1.5, DY(zt))
    # kontaktflater
    s.line(DX(3.4 - 0.049), DY(-BOARD1), DX(3.4 + 0.049), DY(-BOARD1), (RED, 0.7, None))
    s.line(DX(3.4 - 0.024), DY(Z_J1B), DX(3.4 + 0.024), DY(Z_J1B), (RED, 0.7, None))
    s.arrow(DX(3.4), DY(0.165), DX(3.4), DY(0.035), color=RED, lw=0.5, head=2.6)
    s.text(DX(3.4 - 0.049) - 2.0, DY(0.10), f"R_{{Ed}} =", size=T_XS, weight=700, fill=RED, anchor="end", halo=1.2)
    s.text(DX(3.4 - 0.049) - 2.0, DY(0.10) + 3.0, f"{num(r2['RB'], 1)} kN", size=T_XS, weight=700, fill=RED, anchor="end",
           halo=1.2)
    # mål
    s.dim((DX(3.4 - 0.049), DY(zt)), (DX(3.4 + 0.049), DY(zt)), 4.2, "98", size=T_XS, text_off=0.6, weight=600, side=-1)
    s.text(DX(3.4), DY(-0.115), "48", size=T_XS, weight=600, anchor="middle", halo=1.0)
    s.dim((DX(X_COL[0]), DY(zb)), (DX(X_COL[1]), DY(zb)), -5.2, "Ø ca. 200", size=T_XS, text_off=0.6)
    lx = dx0 + 42.0
    s.text(DX(3.4 - 0.049) - 1.4, DY(-BOARD1) + 0.9, "A", size=T_XS, weight=700, fill=RED, anchor="end")
    s.text(DX(3.4 - 0.072) - 1.4, DY(Z_J1B) + 0.2, "B", size=T_XS, weight=700, fill=RED, anchor="end", halo=1.0)
    s.leader((DX(3.4 + 0.049), DY(0.13)), (lx, DY(0.19)), "2 stendere 48 × 98",
             ["98 mm bredde langs B2;", "sidestøttet (utførelse", "ikke kontrollert)"],
             size=T_XS, tsize=T_XS, color=TIMBER, line_fill=INK2)
    s.leader((DX(3.4 + 0.049), DY(-BOARD1)), (lx, DY(0.055)), "Kontaktflate A og B",
             ["A: stendere → gulvbjelke.", "B: gulvbjelke → stålplate.", "Bare bjelken: 48 mm bred.", "Med kubbinger: 98 mm (A)."],
             size=T_XS, tsize=T_XS, color=RED, line_fill=INK2)
    s.leader((DX(3.4 + 0.072), DY(Z_J1B + 0.10)), (lx, DY(-0.115)), "Sidekubbinger",
             ["tykkelse ikke målt; omfang,", "anlegg og feste er ikke", "dokumentert (stiplet)"],
             size=T_XS, tsize=T_XS, color=TIMBER, line_fill=INK2)
    s.leader((DX(3.4 + 0.10), DY(Z_J1B - 0.004)), (lx, DY(-0.25)), "Stålplate og stolpesko",
             ["plate 400 mm (opplyst). Type,", "plassering og feste er ikke", "kjent – vist skjematisk"],
             size=T_XS, tsize=T_XS, color=STEEL, line_fill=INK2)
    s.leader((DX(X_COL[1]), DY(-0.43)), (lx, DY(-0.385)), "Betongsøyle Ø ca. 200",
             ["rett under stenderne;", "fundament er ikke", "dokumentert"],
             size=T_XS, tsize=T_XS, color=CONC, line_fill=INK2)

    # ---------------- beregning B2 ---------------------------------------------------------------
    yc = 113.0
    s.line(cx, yc, cx + cw, yc, (INK2, 0.25, None))
    s.text(cx, yc + 5.2, "Beregning B2", size=T_L, weight=700)
    s.text(cx + cw, yc + 5.2, "IPE 180 · S235 (forutsatt) · L = 3,40 m · lasttilfelle snøfonn mot gavlveggen", size=T_XS,
           fill=INK2, anchor="end")
    s.text(cx, yc + 9.0, "Tiltakshavers overslag til gjennomgang – ikke kontrollert av foretak med ansvarsrett.", size=T_XS,
           fill=AMBER, weight=600)
    yc += 10.0
    wl = 76.0
    y_sys = static_system(s, cx + 4.0, yc, wl - 15.0, L,
                          udls=[(0.10, 2.10, f"{num(w_floor)} kN/m", INK, 0.10)],
                          points=[(1.20, num(p_stair, 2), INK, 0.8), (2.25, num(p_gable, 2), ABOVE, 1.6),
                                  (2.55, num(p_joist, 1), BLUE, 0.3), (3.15, num(p_joist, 1), BLUE, 0.3)],
                          reactions=(f"R_{{A}} = {num(r2['RA'], 1)} kN", f"R_{{B}} = {num(r2['RB'], 1)} kN"),
                          dims=[(0, 2.25, "ca. 2,25"), (2.25, L, "ca. 1,15")], h_load=7.0)
    curve = [(p["x"], p["M"]) for p in r2["curves"]]
    y_m = moment_diagram(s, cx + 4.0, y_sys + 0.5, wl - 15.0, L, curve, h=7.4, x_max=r2["x_M"],
                         label=f"M_{{Ed}} = {num(r2['MEd'], 1)} kNm")
    kR = r2["kR"]
    lt_rows = []
    for dd in f:
        if dd["type"] == "udl" and dd["x1"] == 0.0:
            self_row = ("Egenvekt IPE 180", num(dd["gk"], 3), "–", f"{num(dd['Ed'])} kN/m")
        elif dd["type"] == "udl":
            lt_rows.append(("Gulv via veksling, x ≈ 0,10–2,10", num(dd["gk"]), num(dd["qk"]), f"{num(dd['Ed'])} kN/m"))
        elif abs(dd["x1"] - 1.20) < 1e-6:
            lt_rows.append(("Trapp, x ≈ 1,20 (anslått)", "–", num(dd["qk"]), f"{num(dd['Ed'])} kN"))
        elif abs(dd["x1"] - 2.25) < 1e-6:
            lt_rows.append(("Gavlvegg, x ≈ 2,25 (anslått)", num(dd["gk"]), "–", f"{num(dd['Ed'])} kN"))
        elif abs(dd["x1"] - 2.55) < 1e-6:
            lt_rows.append(("Takbjelke, x ≈ 2,55 og 3,15 (hver)", num(dd["gk"]), num(dd["qk"]), f"{num(dd['Ed'])} kN"))
    lt_rows.append(self_row)
    y_lt = load_table(s, cx + wl + 2.0, yc, cw - wl - 2.0, lt_rows, title="Laster (kN/m og kN)",
                      colfrac=(0.50, 0.13, 0.13, 0.24), bold_last=False,
                      note=f"Dim. = 1,35 g_{{k}} + 1,5 q_{{k}} (forenklet, sikker side). Takbjelke: {num(kR, 3)} m × 0,60 m × last per m²; "
                           f"snøfonn {num(sn['peak'])} kN/m² (NS-EN 1991-1-3, 5.3.6) regnet jevnt over begge; q_{{k}} for takbjelkene "
                           "er snø. Gulv: 0,75 m lastbredde + veksling/rekkverk 0,5 kN/m.")
    yk = max(y_m, y_lt) + 0.6
    c90 = sup["c90"]["B2_col"]
    st = sup["studs"]["B2_col"]["C24"]
    rows = [
        ("Moment, kNm", num(r2["MEd"], 1), num(res["MRd_el"], 1), r2["util_M"], None, None),
        ("Skjær / oppleggskraft O4, kN", num(r2["RB"], 1), num(res["VRd"], 0), r2["util_V"], None, None),
        ("Nedbøyning g + q, mm (L/300)", num(r2["delta_gq"], 1), num(r2["delta_lim"], 1), r2["util_delta"], None, None),
        ("Steg ved opplegg O4, kN", num(r2["RB"], 1), f"{num(sup['web']['FRd_ss0'], 0)}–{num(sup['web']['FRd'], 0)}",
         r2["RB"] / sup["web"]["FRd_ss0"], None, None),
        ("Stendere O4 (forutsatt C24, fastholdt), kN", num(r2["RB"], 1), num(st["strong"]["NRd"], 0), st["util_ecc"], AMBER,
         f"{num(st['util_strong'] * 100, 0)}–{num(st['util_ecc'] * 100, 0)} %"),
        ("Terrassebruk 4,0 kN/m² (uten snø), kNm", num(r2t["MEd"], 1), num(res["MRd_el"], 1), r2t["util_M"], None, None),
        ("Følsomhet: takstripe ved gavl, kNm", num(rob["roof_strip"]["MEd"], 1), num(res["MRd_el"], 1), rob["roof_strip"]["util"],
         AMBER, None),
        ("Vipping uten fastholding av overflensen, kNm", num(r2["MEd"], 1),
         f"{num(r2['ltb']['MbRd_6322'], 1)}–{num(r2['ltb']['MbRd_6323'], 1)}", None, AMBER,
         f"{num(r2['util_ltb_6323'] * 100, 0)}–{num(r2['util_ltb_6322'] * 100, 0)} %"),
        ("Trykk ⊥ fiber ved O4 (98–48 mm), N/mm²", f"{num(c90['sigma_with_blocking'], 1)}–{num(c90['sigma_joist_only'], 1)}",
         num(c90["C24"]["fRd"], 2), None, RED, "ikke dokumentert"),
    ]
    check_table(s, cx, yk, cw, rows, note="Stendere: laveste tall er med sentrisk last, høyeste med 16 mm eksentrisk last (notat kap. 7.3).")

    # ================================================================ nederst til venstre
    by = yb1 + 11.4
    bw1, bw2, bw3 = 46.0, 74.0, 82.0
    s.notebox(22.0, by, bw1, "Lastvei B2", [
        "B2 bærer gulvet fra badsiden via trappevekslingen, trappa, gavlveggens egenvekt og to takbjelker.",
        "O3: stendere → tømmerstokk → grunnmur. O4: stendere → gulvbjelke → stålplate → stolpesko → betongsøyle.",
    ], size=T_XS, tsize=T_S, accent=STEEL_D, pad=2.0)
    s.notebox(22.0 + bw1 + 3.0, by, bw2, "Forutsetninger", [
        "S235 og C24 er forutsatt, ikke dokumentert.",
        "Gavlvegg 5 kN og trapp 3 kN er anslått. Hovedtaklasten er ikke regnet inn på B2 (se C–C) – ikke bekreftet.",
        "3,72 m er målt fra terrassegulv til underkant mønekasse ved mønet (ikke jevn vegghøyde). Snøfonn og "
        "terrassebruk virker ikke samtidig.",
        "Overflensen holdes sideveis av veksling og takbjelker. Stenderne er forutsatt sideveis fastholdt.",
    ], size=T_XS, tsize=T_S, accent=INK3, pad=2.0)
    s.notebox(22.0 + bw1 + bw2 + 6.0, by, bw3, "Kontrollpunkter på stedet", [
        "Trykkflate under stenderne ved O4: ligger kubbingene an oppe, og er de festet eller har anlegg nede?",
        "Står stenderne rett over stålplate, stolpesko og søyle? Stolpesko: type og feste. Søyle: fundament.",
        "Bjelkeendenes feste til stenderne. Holdt mot vridning? Hva holder stenderne ved O4 sideveis?",
        "Vekslingens og takbjelkenes feste til overflensen.",
        "Gavlveggen: bærer den en takstripe? Hva står den på?",
    ], size=T_XS, tsize=T_S, accent=AMBER, pad=2.0)

    s.save(out_svg)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "S-03.svg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out)
    print("skrev", out)
