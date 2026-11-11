"""sheet2.py – Ark 2: snitt A–A langs B1 (1:20), detalj D1 ved opplegg O1 (1:10) og beregning B1."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403
from calcfig import *          # noqa: E402,F403
import model as M              # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "results.json"), encoding="utf-8"))

# ---- geometri i snittet (m). x fra oppleggssenter O1 mot O2; z opp fra overkant gulv 1. etasje ----
L = 3.63
H_STUD = 2.07
Z_BB, Z_BT = H_STUD, H_STUD + 0.18          # stålbjelke under-/overkant
J2_H, BOARD2 = 0.148, 0.037                 # bjelkelag og gulv 2. etasje (vist i prinsipp)
BOARD1, J1_H = 0.022, 0.196                 # gulvbord og gulvbjelker 48 x 196 i 1. etasje
Z_J1T, Z_J1B = -BOARD1, -BOARD1 - J1_H
Z_IPNB = Z_J1B - 0.200
Z_GROUND = -0.800                           # terreng i krypkjeller (ikke målt – vist omtrentlig)
Z_BOT = -0.905                              # bruddlinje: underlag og fundament er ikke kjent
X_CHIM = (-0.454, -0.049)
X_BLOCK = (-0.300, 0.600)
X_IPN = (-0.340, 3.529)
X_FOUND = (3.529, 3.779)
X_LOG = (3.580, 3.728)
X_LOGWALL = (3.547, 3.761)
JOISTS1 = [0.0, 0.6, 1.2, 1.8, 2.4, 3.0]
JOISTS2 = [0.42, 1.02, 1.62, 2.22, 2.82, 3.42]


def build(out_svg):
    s = Sheet()
    s.frame(M.PROJECT["attachment"])
    tb = s.titleblock(title="Stålbjelke B1 – snitt A–A og opplegg",
                      subtitle="Snitt langs kjøkkenbjelken B1, detalj ved opplegg O1 og beregningssammendrag",
                      drawing_no="S-02", sheet_no="2 av 3", scale="1:20 / 1:10", rev=M.PROJECT["rev"],
                      date=M.PROJECT["date"], project=M.PROJECT["line"], owner=M.PROJECT["owner"], case=M.PROJECT["case"])
    rev_top = s.revtable(tb[0], tb[1], tb[2], M.REV_ROWS)
    s.figtitle(22, 21.5, "Snitt A–A langs B1 – kjøkkenbjelke", "1:20", "sett i pilretningen på plan S-01 · mål i meter, tverrsnitt i mm")

    v = View(s, 20, 66.0, 174.5, mx=0.0, my=0.0, flip_y=True)
    X, Y, K = v.X, v.Y, v.k

    def RR(x1, z1, x2, z2):
        return (X(min(x1, x2)), Y(max(z1, z2)), abs(x2 - x1) * K, abs(z2 - z1) * K)

    r1 = R["B1"]
    r1s = R["B1_sens"]
    res = R["section"]
    sup = R["supports"]

    z_top = Z_BT + J2_H + BOARD2 + 0.20

    # ---------------------------------------------------------------- bakgrunn: pipe, tømmervegg
    s.brick_elev(*RR(X_CHIM[0], 0.0, X_CHIM[1], z_top))
    s.breakline(X(X_CHIM[0]) - 1.5, Y(z_top), X(X_CHIM[1]) + 1.5, Y(z_top))
    s.rect(*RR(X_CHIM[0], Z_GROUND, X_CHIM[1], 0.0), (BRICK, 0.25, "1.8 1.0"))
    # tømmervegg bak stenderne (opprinnelig yttervegg) – over gulv
    s.logwall(*RR(X_LOGWALL[0], 0.0, X_LOGWALL[1], z_top), n=18)
    s.breakline(X(X_LOGWALL[0]) - 1.5, Y(z_top), X(X_LOGWALL[1]) + 1.5, Y(z_top))

    # ---------------------------------------------------------------- under gulv
    s.ground(X(-0.62), X(3.92), Y(Z_GROUND))
    for (xa, xb, zt_) in ((X_BLOCK[0], X_BLOCK[1], Z_IPNB), (X_FOUND[0], X_FOUND[1], -0.148)):
        s.concrete(*RR(xa, Z_BOT, xb, zt_))
        s.line(X(xa) + 0.2, Y(Z_BOT), X(xb) - 0.2, Y(Z_BOT), (PAPER, 0.9, None))      # åpen bunn: fundament ikke kjent
        s.breakline(X(xa) - 1.5, Y(Z_BOT), X(xb) + 1.5, Y(Z_BOT))
    # IPN 200
    s.ibeam_side(*RR(X_IPN[0], Z_IPNB, X_IPN[1], Z_J1B), tf=0.0113 * K, label="IPN 200 – eksisterende", size=T_S)
    # stålkonsoll i grunnmuren – vist skjematisk (utforming og innfesting er ikke dokumentert)
    cxa, cza = X_FOUND[0], Z_IPNB
    s.rect(*RR(cxa - 0.14, cza - 0.13, cxa, cza), (STEEL, 0.3, "1.4 0.8"), fill="#eef3f8")
    s.text(X(cxa - 0.07), Y(cza - 0.065) + 1.0, "?", size=T_M, weight=700, fill=STEEL, anchor="middle")
    # gulvbjelker 48 x 196 (snittet) og gulvbord
    for xj in JOISTS1:
        s.timber_section(*RR(xj - 0.024, Z_J1B, xj + 0.024, Z_J1T), new=(xj == 0.0))
    s.timber_side(*RR(X_CHIM[1], Z_J1T, X_LOG[0], 0.0), grain=None)
    # tømmerstokk 148 x 148 over grunnmuren
    s.timber_section(*RR(X_LOG[0], -0.148, X_LOG[1], 0.0))

    # ---------------------------------------------------------------- over gulv: stendere, bjelke, bjelkelag
    s.timber_side(*RR(-0.049, 0.0, 0.049, H_STUD), grain="v", new=True, n=3)                 # O1: 2 x 48x98
    s.timber_side(*RR(X_LOG[0], 0.0, X_LOG[1], H_STUD), grain="v", new=True, n=5)            # O2: 2 x 48x148
    s.ibeam_side(*RR(-0.049, Z_BB, L + 0.049, Z_BT), tf=0.008 * K, label="B1 – IPE 180 (montert 2018)", size=T_L)
    for xj in JOISTS2:
        s.timber_section(*RR(xj - 0.024, Z_BT, xj + 0.024, Z_BT + J2_H))
    s.timber_side(*RR(X_CHIM[1], Z_BT + J2_H, X_LOGWALL[0], Z_BT + J2_H + BOARD2), grain=None)

    # ---------------------------------------------------------------- laster
    yl_top = Y(z_top + 0.13)
    s.udl(X(0), X(L), yl_top, Y(Z_BT + J2_H + BOARD2) - 0.8, n=13,
          label=f"last fra etasjeskillet (lastbredde 2,55 m), bodveggen og bjelkens egenvekt:  q_{{Ed}} = {num(r1['qEd']['forenklet'])} kN/m")
    # oppleggskrefter (lastvei) – piler ned gjennom oppleggene
    for xs, lab, anc in ((0.0, f"R_{{Ed}} = {num(r1['VEd'], 1)} kN", "start"), (L, f"R_{{Ed}} = {num(r1['VEd'], 1)} kN", "end")):
        s.arrow(X(xs), Y(1.44), X(xs), Y(1.14), color=RED, lw=0.45, head=2.4)
        dxl = 4.2 if anc == "start" else -6.6
        s.text(X(xs) + dxl, Y(1.29) + 0.9, lab, size=T_XS, weight=700, fill=RED, anchor=anc)

    # ---------------------------------------------------------------- målsetting
    zL = 1.70
    s.dim((X(0), Y(zL)), (X(L), Y(zL)), 0, "L = 3,63 (senter–senter opplegg)", ext=False, weight=700, text_shift=-31.0)
    for xs in (0.0, L):
        s.line(X(xs), Y(Z_BB) + 0.6, X(xs), Y(zL) + 2.5, (INK2, 0.13, "3 0.8 0.5 0.8"))
    s.dim((X(1.95), Y(0.0)), (X(1.95), Y(H_STUD)), 0, "2,07", ext=False, weight=700)
    s.text(X(1.95) + 2.2, Y(1.03) - 1.2, "underkant stendere –", size=T_XS, fill=INK2)
    s.text(X(1.95) + 2.2, Y(1.03) + 2.0, "underkant stålbjelke", size=T_XS, fill=INK2)
    # opplegg 98 mm
    s.dim((X(-0.049), Y(Z_BB)), (X(0.049), Y(Z_BB)), 4.6, "ca. 98", size=T_XS, text_off=0.6, weight=600, side=-1,
          text_shift=4.0)
    s.dim((X(L - 0.049), Y(Z_BB)), (X(L + 0.049), Y(Z_BB)), 4.6, "ca. 98", size=T_XS, text_off=0.6, weight=600, side=-1,
          text_shift=-4.0)
    # betongkloss
    yb1 = Y(Z_BOT) + 5.0
    s.dim((X(X_BLOCK[0]), yb1), (X(0.0), yb1), 0, "ca. 0,30", ext=False, size=T_S)
    s.dim((X(0.0), yb1), (X(X_BLOCK[1]), yb1), 0, "ca. 0,60", ext=False, size=T_S)
    s.dim((X(X_BLOCK[0]), yb1 + 6.2), (X(X_BLOCK[1]), yb1 + 6.2), 0, "0,90 betongkloss", ext=False, size=T_S)
    for xx in (X_BLOCK[0], 0.0, X_BLOCK[1]):
        s.line(X(xx), Y(Z_BOT) + 1.0, X(xx), yb1 + (7.4 if xx != 0.0 else 1.2), (INK, 0.13, None))
    s.dim((X(X_FOUND[0]), yb1), (X(X_FOUND[1]), yb1), 0, "ca. 0,25", ext=False, size=T_S)
    for xx in X_FOUND:
        s.line(X(xx), Y(Z_BOT) + 1.0, X(xx), yb1 + 1.2, (INK, 0.13, None))

    # ---------------------------------------------------------------- tekst i snittet
    xl = X(0.049) + 5.0
    s.leader((X(0.049), Y(0.62)), (xl + 4, Y(0.86)), "O1 – opplegg ved teglsteinspipa",
             ["2 stendere 48 × 98, skrudd fast i pipa.", "Oppleggslengde for B1: ca. 98 mm.",
              "Videre lastvei: gulvbjelke 48 × 196 →", "IPN 200 → betongkloss. Se detalj D1."], size=T_XS, tsize=T_S)
    xr = X(X_LOG[0]) - 5.0
    s.leader((X(X_LOG[0]), Y(0.62)), (xr - 4, Y(0.86)), "O2 – opplegg mot grunnmuren",
             ["2 stendere 48 × 148 i døråpningen i tømmerveggen:", "oppleggslengde ca. 98 mm + 50 mm inn i veggen.",
              "Står på tømmerstokk 148 × 148 rett over", "grunnmuren (ca. 0,25 m)."], size=T_XS, tsize=T_S, align="right")
    # etiketter over/under
    # bjelkelag 2. etg.
    s.leader((X(JOISTS2[1] + 0.024), Y(Z_BT + 0.07)), (X(0.62), Y(Z_BB) + 3.2), "Bjelkelag 2. etasje på overflensen",
             ["bjelkeavstand ikke kontrollmålt (vist c/c 0,6)", "holder B1 sideveis (forutsetning)"], size=T_XS, tsize=T_XS,
             color=TIMBER, line_fill=INK2)
    # tømmervegg / pipe
    s.text(X((X_CHIM[0] + X_CHIM[1]) / 2), Y(1.25), "teglsteinspipe (ute av bruk) – står bak snittet", size=T_XS, fill=BRICK,
           anchor="middle", rot=90, halo=1.4, weight=600)
    s.text(X(X_CHIM[0]) - 4.6, Y(Z_GROUND / 2), "pipas fundament", size=T_XS, fill=BRICK, anchor="middle", rot=90)
    s.text(X(X_CHIM[0]) - 1.4, Y(Z_GROUND / 2), "ikke undersøkt", size=T_XS, fill=BRICK, anchor="middle", rot=90)
    s.text(X(X_LOGWALL[1]) + 2.6, Y(1.25), "tømmervegg (opprinnelig yttervegg)", size=T_XS, fill=TIMBER, anchor="middle",
           rot=90, weight=600)
    # under gulv
    s.leader((X(1.2 + 0.024), Y(Z_J1B + 0.06)), (X(1.34), Y(Z_IPNB) + 4.6), "Gulvbjelker 48 × 196",
             ["avstand ikke målt – vist skjematisk"], size=T_XS, tsize=T_XS, color=TIMBER, line_fill=INK2)
    s.leader((X(cxa - 0.14), Y(cza - 0.065)), (X(3.26), Y(Z_IPNB) + 4.6), "Stålkonsoll i grunnmuren",
             ["bærer IPN-enden. Utforming og", "innfesting er ikke dokumentert."],
             size=T_XS, tsize=T_XS, color=STEEL, line_fill=INK2, align="right")
    s.text(X(0.15), Y((Z_IPNB + Z_GROUND) / 2) + 0.9, "betongkloss", size=T_XS, fill=CONC, anchor="middle", halo=1.4,
           weight=600)
    s.text(X((X_FOUND[0] + X_FOUND[1]) / 2), Y(-0.50), "grunnmur", size=T_XS, fill=CONC, anchor="middle", rot=90, halo=1.4,
           weight=600)
    s.text(X(1.72), Y(Z_GROUND) - 1.6, "krypkjeller – høyden er ikke målt, vist omtrentlig. Kloss og grunnmur: underlag ikke kjent.",
           size=T_XS, fill=INK2, anchor="middle", italic=True)
    # detaljmarkering D1
    s.rect(X(-0.33), Y(0.30), 0.66 * K, (0.30 - (-0.70)) * K, (INK2, 0.25, "3 1.2"), rx=2.0)
    s.tag(X(0.33) + 3.8, Y(0.30) + 3.8, "D1", size=T_XS)
    s.text(X(0.33) + 7.6, Y(0.30) + 3.2, "tverrsnitt", size=T_XS, fill=INK2)
    s.text(X(0.33) + 7.6, Y(0.30) + 6.4, "ved O1", size=T_XS, fill=INK2)

    # målestokklinjal
    s.scalebar(X(1.25), Y(Z_BOT) + 6.0, K, meters=(0, 0.5, 1), sub=0.1)
    s.text(X(1.25) + K + 8.0, Y(Z_BOT) + 10.0, "Målestokk gjelder ved utskrift i A3.", size=T_XS, fill=INK2)
    # tegnforklaring for snittet
    s.legend_row(22.0, 27.2, [("steel", "stål"), ("timber_new", "tre, montert 2018"), ("timber", "tre, eksisterende"),
                              ("conc", "betong"), ("brick", "tegl (bak snittet)"), ("unknown", "ikke dokumentert – vist skjematisk"),
                              ("react", "oppleggskraft")])
    s.text(22.0, 31.0, "B1 og stenderne er fra 2018. For IPN 200, betongkloss og stålkonsoll er alderen ikke dokumentert.",
           size=T_XS, fill=INK2)

    # ================================================================ høyre kolonne: detalj D1 (1:10)
    cx, cw = 266.0, 142.0
    s.figtitle(cx, 21.5, "Detalj D1 – lastføring under O1", "1:10", "tverrsnitt på tvers av B1 · pipa bak")
    d = View(s, 10, cx + 50.0, 48.5, mx=0.0, my=0.0, flip_y=True)
    DX, DY, DK = d.X, d.Y, d.k

    def DR(x1, z1, x2, z2):
        return (DX(min(x1, x2)), DY(max(z1, z2)), abs(x2 - x1) * DK, abs(z2 - z1) * DK)

    zt = 0.195                              # bruddlinje i stendere
    zb = -0.50
    # pipe bak (øst for bjelkeaksen)
    s.brick_elev(*DR(0.0, Z_J1T + 0.0, 0.405, zt), course=7.5)
    # betongkloss
    s.concrete(*DR(-0.204, zb, 0.205, Z_IPNB))
    s.breakline(DX(-0.204) - 1.5, DY(zb), DX(0.205) + 1.5, DY(zb))
    # IPN 200 i tverrsnitt (b = 90, tw = 7,5, tf = 11,3)
    s.ibeam_section(DX(0.0), DY(Z_J1B), 0.200 * DK, 0.090 * DK, 0.0075 * DK, 0.0113 * DK)
    # gulvbjelke 48 x 196 sett fra siden, gulvbord
    s.timber_side(*DR(-0.44, Z_J1B, 0.46, Z_J1T), grain="h", new=True, n=5)
    s.timber_side(*DR(-0.44, Z_J1T, 0.46, 0.0), grain=None)
    for xe in (-0.44, 0.46):
        s.breakline(DX(xe), DY(0.02), DX(xe), DY(Z_J1B - 0.02))
    # stendere 2 x 48 x 98 (sett forfra)
    s.timber_side(*DR(-0.048, 0.0, 0.0, zt), grain="v", new=True, n=2)
    s.timber_side(*DR(0.0, 0.0, 0.048, zt), grain="v", new=True, n=2)
    s.breakline(DX(-0.048) - 1.5, DY(zt), DX(0.048) + 1.5, DY(zt))
    # kontaktflater (trykk vinkelrett på fiber)
    s.line(DX(-0.048), DY(0.0 - BOARD1), DX(0.048), DY(0.0 - BOARD1), (RED, 0.7, None))
    s.line(DX(-0.045), DY(Z_J1B), DX(0.045), DY(Z_J1B), (RED, 0.7, None))
    # lastpil
    s.arrow(DX(0.0), DY(0.175), DX(0.0), DY(0.035), color=RED, lw=0.5, head=2.6)
    s.text(DX(0.0) - 6.5, DY(0.10), f"R_{{Ed}} = {num(r1['VEd'], 1)} kN", size=T_XS, weight=700, fill=RED, anchor="end",
           halo=1.2)
    # mål
    s.dim((DX(-0.048), DY(zt)), (DX(0.048), DY(zt)), 4.2, "96", size=T_XS, text_off=0.6, weight=600, side=-1)
    s.dim((DX(-0.045), DY(Z_IPNB)), (DX(0.045), DY(Z_IPNB)), -3.6, "90", size=T_XS, text_off=0.6, weight=600)
    s.text(DX(0.0), DY(zb) + 5.4, "bredde og underlag ikke målt", size=T_XS, fill=INK2, anchor="middle", italic=True)
    s.scalebar(cx, 26.2, DK, meters=(0, 0.1, 0.2), sub=0.05)
    s.dim((DX(-0.44), DY(Z_J1T)), (DX(-0.44), DY(Z_J1B)), 4.5, "196", size=T_XS, text_off=0.6)
    # henvisninger i detaljen
    lx = cx + 100.0
    s.leader((DX(0.048), DY(0.13)), (lx, DY(0.195) - 0.5), "2 stendere 48 × 98", ["98 mm bredde langs B1,", "skrudd fast i pipa"],
             size=T_XS, tsize=T_XS, color=TIMBER, line_fill=INK2)
    s.leader((DX(0.048), DY(-BOARD1)), (lx, DY(0.05)), "Kontaktflate A", ["stendere → gulvbjelke:", "96 × 48 mm (bjelken er", "48 mm bred)"],
             size=T_XS, tsize=T_XS, color=RED, line_fill=INK2)
    s.leader((DX(0.30), DY(Z_J1B + 0.10)), (lx, DY(-0.135)), "Gulvbjelke 48 × 196", ["ligger på tvers over IPN"], size=T_XS,
             tsize=T_XS, color=TIMBER, line_fill=INK2)
    s.leader((DX(0.045), DY(Z_J1B)), (lx, DY(-0.25)), "Kontaktflate B", ["gulvbjelke → IPN-flens:", "90 × 48 mm"], size=T_XS,
             tsize=T_XS, color=RED, line_fill=INK2)
    s.leader((DX(0.045), DY(Z_J1B - 0.12)), (lx, DY(-0.37)), "IPN 200", ["b = 90 mm"], size=T_XS, tsize=T_XS, color=STEEL,
             line_fill=INK2)
    s.leader((DX(0.205), DY(-0.50)), (lx, DY(-0.47)), "Betongkloss", ["lastpunkt ca. 0,60 m inne", "på 0,90 m lang kloss"],
             size=T_XS, tsize=T_XS, color=CONC, line_fill=INK2)
    s.text(DX(0.23), DY(0.10), "pipe (bak)", size=T_XS, fill=BRICK, anchor="middle", weight=600, halo=1.2)
    yd1 = DY(zb) + 7.4
    yd1 = s.mtext(cx, yd1 + 2.5, wrap("Kontaktflatene A og B gir trykk vinkelrett på fiber i gulvbjelken. Med bare 48 mm bredde er "
                                      "flatene mindre enn det regnestykket krever (se tabellen under). Faktisk utførelse – om "
                                      "det ligger kubbinger eller svill som fordeler lasten – er ikke dokumentert og må "
                                      "kontrollmåles på stedet.", T_XS, cw), size=T_XS, fill=INK2)

    # ================================================================ høyre kolonne: beregning B1
    yc = yd1 + 2.5
    s.line(cx, yc, cx + cw, yc, (INK2, 0.25, None))
    s.text(cx, yc + 5.2, "Beregning B1", size=T_L, weight=700)
    s.text(cx + cw, yc + 5.2, "IPE 180 · S235 (forutsatt) · L = 3,63 m", size=T_XS, fill=INK2, anchor="end")
    s.text(cx, yc + 9.0, "Tiltakshavers overslag til gjennomgang – ikke kontrollert av foretak med ansvarsrett.", size=T_XS,
           fill=AMBER, weight=600)
    yc += 10.6
    # statisk system + momentdiagram (venstre halvdel), laster (høyre halvdel)
    wl = 60.0
    y_sys = static_system(s, cx + 3.0, yc, wl - 6.0, L,
                          udls=[(0, L, f"q_{{Ed}} = {num(r1['qEd']['forenklet'])} kN/m", INK)],
                          reactions=(f"{num(r1['VEd'], 1)} kN", f"{num(r1['VEd'], 1)} kN"),
                          dims=[(0, L, "3,63")], h_load=6.0)
    curve = [(L * i / 60, r1["qEd"]["forenklet"] * (L * i / 60) * (L - L * i / 60) / 2) for i in range(61)]
    y_m = moment_diagram(s, cx + 3.0, y_sys + 1.0, wl - 6.0, L, curve, h=8.0, x_max=L / 2,
                         label=f"M_{{Ed}} = {num(r1['MEd'], 1)} kNm")
    gp = r1["g_parts"]
    y_lt = load_table(s, cx + wl + 4.0, yc, cw - wl - 4.0, [
        ("Etasjeskille 1,2 / 2,0 kN/m² × 2,55 m", num(gp["floor"]), num(r1["qk"]), ""),
        ("Bodvegg i 2. etasje (anslått)", num(gp["wall"]), "–", ""),
        ("Egenvekt IPE 180", num(gp["steel"]), "–", ""),
        ("Sum, kN/m", num(r1["gk"]), num(r1["qk"]), num(r1["qEd"]["forenklet"])),
    ], title="Laster, kN/m", colfrac=(0.58, 0.14, 0.14, 0.14),
        note="q_{Ed} = 1,35 g_{k} + 1,5 q_{k} (forenklet, på sikker side av NS-EN 1990 lign. 6.10a/b).")
    yk = max(y_m, y_lt) + 0.6
    c90 = sup["c90"]["B1_pipe"]
    st = sup["studs"]["B1_pipe"]["C24"]
    rows = [
        ("Moment, kNm", num(r1["MEd"], 1), num(res["MRd_el"], 1), r1["util_M"], None, None),
        ("Skjær / oppleggskraft, kN", num(r1["VEd"], 1), num(res["VRd"], 0), r1["util_V"], None, None),
        ("Nedbøyning g + q, mm (L/300)", num(r1["delta_gq"], 1), num(r1["delta_lim"], 1), r1["util_delta"], None, None),
        ("Steg ved opplegg, kN", num(r1["VEd"], 1), f"{num(sup['web']['FRd_ss0'], 0)}–{num(sup['web']['FRd'], 0)}",
         r1["VEd"] / sup["web"]["FRd_ss0"], None, None),
        ("Stendere O1 (forutsatt C24, fastholdt), kN", num(r1["VEd"], 1), num(st["strong"]["NRd"], 0), st["util_ecc"], AMBER, None),
        ("Følsomhet: lastbredde 3,71 m, kNm", num(r1s["MEd"], 1), num(res["MRd_el"], 1), r1s["util_M"], AMBER, None),
        ("Vipping uten fastholding av overflensen, kNm", num(r1["MEd"], 1), f"{num(r1['ltb']['MbRd_6322'], 1)}–{num(r1['ltb']['MbRd_6323'], 1)}",
         None, AMBER, f"{num(r1['util_ltb_6323'] * 100, 0)}–{num(r1['util_ltb_6322'] * 100, 0)} %"),
        ("Trykk ⊥ fiber, flate A og B (48 mm), N/mm²", f"{num(c90['sigma_joist_only'], 1)}–{num(c90['sigma_min'], 1)}",
         num(c90["C24"]["fRd"], 1), None, RED, "ikke dokumentert"),
    ]
    yk = check_table(s, cx, yk, cw, rows)

    # ================================================================ nederst til venstre: lastvei, forutsetninger, kontrollpunkter
    by = Y(Z_BOT) + 15.5
    bw1, bw2, bw3 = 58.0, 64.0, 80.0
    s.notebox(22.0, by, bw1, "Lastvei B1", [
        "Bjelkelaget i 2. etasje ligger på overflensen. B1 bærer en lastbredde på 2,55 m og bodveggen i 2. etasje.",
        "O1: stendere → gulvbjelke → IPN 200 → betongkloss. O2: stendere → tømmerstokk → grunnmur.",
        "Etter opplysningene sto den fjernede veggen i samme linje, over IPN 200. Lasten er nå samlet i to opplegg. "
        "Ikke kontrollert.",
    ], size=T_XS, tsize=T_S, accent=STEEL_D, pad=2.2)
    s.notebox(22.0 + bw1 + 3.0, by, bw2, "Forutsetninger", [
        "S235 og C24 er forutsatt, ikke dokumentert.",
        "Bodveggen i 2. etasje bærer ikke taklast (vurdert ved befaring). Egenlast 1,2 kN/m² gjelder lett bjelkelag.",
        "Bjelkelaget regnes som separate felt (3,60 og 1,50 m). Full kontinuitet er vist som følsomhet.",
        "Momentkapasiteten forutsetter at bjelkelaget holder overflensen sideveis, og at stenderne er sideveis fastholdt.",
    ], size=T_XS, tsize=T_S, accent=INK3, pad=2.2)
    s.notebox(22.0 + bw1 + bw2 + 6.0, by, bw3, "Kontrollpunkter på stedet", [
        "Bjelkelagets feste eller anlegg mot overflensen langs hele B1.",
        "Bjelkeendenes anlegg og feste til stenderne. Er endene sikret mot velting?",
        "Trykkflater under stenderne ved O1 (kubbinger eller svill?) og mot IPN-flensen. Står stenderne rett over IPN-en?",
        "O1 er sidestøttet av pipa. Pipa kan ikke rives uten ny avstivning.",
        "Tømmerstokk og grunnmur under O2. Betongkloss, IPN 200 og stålkonsoll: tilstand og underlag.",
    ], size=T_XS, tsize=T_S, accent=AMBER, pad=2.2)

    s.save(out_svg)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "S-02.svg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    build(out)
    print("skrev", out)
