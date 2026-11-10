"""figs.py – figurer til beregningsnotatet (SVG -> PNG via render.js).

fig_b1      statisk system, skjærkraft og moment for B1
fig_b2      statisk system, skjærkraft og moment for B2 (snøfonn)
fig_snow    snøfonn mot gavlveggen etter NS-EN 1991-1-3 pkt. 5.3.6
fig_path    lastveier med dokumentasjonsstatus
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawlib import *          # noqa: E402,F403

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, "results.json"), encoding="utf-8"))


class Fig(Sheet):
    def __init__(self, w, h):
        self.W, self.H = w, h
        super().__init__()


def diagram(s, x, y, w, L, pts, *, h=12.0, title="", fill=STEEL_F, color=STEEL, labels=(), zero_mid=False):
    """Generelt diagram (V eller M). pts: [(x, verdi)]. Positiv verdi tegnes nedover hvis zero_mid=False."""
    k = w / L
    vmax = max(abs(v) for _, v in pts) or 1.0
    s.text(x - 3.0, y + (h / 2 if zero_mid else 0) + 1.0, title, size=T_S, weight=600, fill=INK2, anchor="end")
    y0 = y + (h / 2 if zero_mid else 0)
    sc = (h / 2 if zero_mid else h) / vmax
    poly = [(x, y0)] + [(x + xm * k, y0 + (-v if zero_mid else v) * sc) for xm, v in pts] + [(x + w, y0)]
    s.poly(poly, (color, 0.3, None), fill=fill, close=True, opacity=0.85)
    s.line(x, y0, x + w, y0, (INK, 0.3, None))
    for (xm, v, txt, dy, anc) in labels:
        s.text(x + xm * k, y0 + (-v if zero_mid else v) * sc + dy, txt, size=T_S, weight=700, fill=color, anchor=anc,
               halo=1.2)
    return y + h


def beam(s, x, y, w, L, *, udls=(), points=(), reactions=("", ""), dims=()):
    k = w / L
    X = lambda xm: x + xm * k          # noqa: E731
    yb = y + 22.0
    for (x1, x2, label, color, hh) in udls:
        s.udl(X(x1), X(x2), yb - hh, yb - 0.8, color=color, label=label, size=T_S,
              n=max(3, int((x2 - x1) * k / 6) + 1))
    for (xp, label, color, hh, anc, dx) in points:
        s.pload(X(xp), yb - hh, yb - 0.8, label, color=color, size=T_S, lw=0.4, anchor=anc, label_dx=dx)
    s.line(X(0), yb, X(L), yb, (INK, 0.8, None))
    for xs in (0, L):
        s.poly([(X(xs), yb), (X(xs) - 2.2, yb + 3.6), (X(xs) + 2.2, yb + 3.6)], (INK, 0.25, None), fill=PAPER, close=True)
        s.line(X(xs) - 3.0, yb + 3.6, X(xs) + 3.0, yb + 3.6, (INK, 0.25, None))
    s.text(X(0), yb + 8.2, reactions[0], size=T_S, weight=700, anchor="middle")
    s.text(X(L), yb + 8.2, reactions[1], size=T_S, weight=700, anchor="middle")
    yd = yb + 13.0
    for (x1, x2, label) in dims:
        s.dim((X(x1), yd), (X(x2), yd), 0, label, ext=False, size=T_S, text_off=0.8)
    return yd + 3.0


def fig_b1(path):
    b = R["B1"]
    L = b["L"]
    q = b["qEd"]["forenklet"]
    s = Fig(170, 92)
    x, w = 38.0, 112.0
    s.text(x - 3.0, 12.0, "Last og", size=T_S, weight=600, fill=INK2, anchor="end")
    s.text(x - 3.0, 15.3, "system", size=T_S, weight=600, fill=INK2, anchor="end")
    y = beam(s, x, 2.0, w, L, udls=[(0, L, f"q_{{Ed}} = {num(q)} kN/m", INK, 7.0)],
             reactions=(f"R_{{Ed}} = {num(b['VEd'], 1)} kN", f"R_{{Ed}} = {num(b['VEd'], 1)} kN"),
             dims=[(0, L, f"L = {num(L)} m")])
    vp = [(0, b["VEd"]), (L, -b["VEd"])]
    y = diagram(s, x, y + 2.0, w, L, vp, h=14.0, title="V_{Ed} [kN]", zero_mid=True, fill="#e6ebf0", color=INK2,
                labels=[(0.0, b["VEd"], num(b["VEd"], 1), -1.2, "start"), (L, -b["VEd"], "−" + num(b["VEd"], 1), 3.4, "end")])
    mp = [(L * i / 80, q * (L * i / 80) * (L - L * i / 80) / 2) for i in range(81)]
    diagram(s, x, y + 6.0, w, L, mp, h=15.0, title="M_{Ed} [kNm]",
            labels=[(L / 2, b["MEd"], f"M_{{Ed}} = {num(b['MEd'], 1)} kNm", 4.0, "middle")])
    s.save(path)


def fig_b2(path):
    b = R["B2"]
    L = b["L"]
    f = b["design_loads"]
    wf = next(d["Ed"] for d in f if d["type"] == "udl" and abs(d["x1"] - 0.10) < 1e-6)
    ps = next(d["Ed"] for d in f if d["type"] == "pt" and abs(d["x1"] - 1.20) < 1e-6)
    pg = next(d["Ed"] for d in f if d["type"] == "pt" and abs(d["x1"] - 2.25) < 1e-6)
    pj = next(d["Ed"] for d in f if d["type"] == "pt" and abs(d["x1"] - 2.55) < 1e-6)
    ws = next(d["Ed"] for d in f if d["type"] == "udl" and d["x1"] == 0.0)
    s = Fig(170, 108)
    x, w = 38.0, 112.0
    s.text(x - 3.0, 20.0, "Last og", size=T_S, weight=600, fill=INK2, anchor="end")
    s.text(x - 3.0, 23.3, "system", size=T_S, weight=600, fill=INK2, anchor="end")
    y = beam(s, x, 8.0, w, L,
             udls=[(0.10, 2.10, None, INK, 7.0)],
             points=[(1.20, f"trapp {num(ps, 2)} kN", INK, 14.5, "middle", 0.0),
                     (2.25, f"gavlvegg {num(pg, 2)} kN", ABOVE, 21.5, "end", 6.0),
                     (2.55, f"{num(pj, 2)} kN", BLUE, 14.5, "start", -3.0),
                     (3.15, f"{num(pj, 2)} kN", BLUE, 9.0, "middle", 0.0)],
             reactions=(f"R_{{A}} = {num(b['RA'], 1)} kN", f"R_{{B}} = {num(b['RB'], 1)} kN"),
             dims=[(0, 0.10, ""), (0.10, 1.20, "1,10"), (1.20, 2.10, "0,90"), (2.10, 2.25, ""), (2.25, 2.55, "0,30"),
                   (2.55, 3.15, "0,60"), (3.15, L, "0,25")])
    kk = w / L
    s.text(x + 0.14 * kk, 8.0 + 22.0 - 8.3, f"gulv {num(wf)} kN/m", size=T_S, weight=500)
    s.text(x + 3.30 * kk, 8.0 + 22.0 - 15.8, "takbjelker (snøfonn)", size=T_XS, fill=BLUE, weight=600, anchor="middle")
    s.text(x + w, 8.0 + 22.0 + 18.6, f"i tillegg: egenvekt IPE 180, {num(ws)} kN/m over hele spennet", size=T_XS, fill=INK2,
           anchor="end")
    cur = b["curves"]
    vp = [(p["x"], p["V"]) for p in cur]
    y = diagram(s, x, y + 5.5, w, L, vp, h=15.0, title="V_{Ed} [kN]", zero_mid=True, fill="#e6ebf0", color=INK2,
                labels=[(0.0, b["RA"], num(b["RA"], 1), -1.2, "start"), (L, -b["RB"], "−" + num(b["RB"], 1), 3.6, "end")])
    mp = [(p["x"], p["M"]) for p in cur]
    diagram(s, x, y + 6.0, w, L, mp, h=15.0, title="M_{Ed} [kNm]",
            labels=[(b["x_M"], b["MEd"], f"M_{{Ed}} = {num(b['MEd'], 1)} kNm ved x = {num(b['x_M'])} m", 4.0, "middle")])
    s.save(path)


def fig_snow(path):
    sn = R["snow"]
    s = Fig(170, 78)
    k = 11.0                       # mm per m
    x0, y0 = 66.0, 60.0            # gavlveggens fot (terrassegulv)
    h = 3.72
    # øvre bygg (2. etasje med tak) – prinsipp
    s.rect(x0 - 4.2 * k, y0 - h * k + 0.0, 4.2 * k, h * k, (INK, 0.35, None), fill="#eef0f2")
    s.text(x0 - 2.1 * k, y0 - h * k / 2 - 1.0, "2. etasje", size=T_M, fill=INK2, anchor="middle", weight=600)
    s.text(x0 - 2.1 * k, y0 - h * k / 2 + 3.0, "gavlvegg mot terrassen", size=T_S, fill=INK2, anchor="middle")
    s.text(x0 - 2.1 * k, y0 - h * k / 2 + 6.4, "b_{1} = 11,0 m (lengde 2. etasje)", size=T_XS, fill=INK3, anchor="middle")
    # terrasse
    b2 = 4.1
    s.rect(x0, y0, b2 * k, 2.2, (BLUE, 0.3, None), fill=BLUE_F)
    s.text(x0 + b2 * k / 2, y0 + 6.0, "takterrasse, b_{2} ≈ 4,1 m", size=T_S, fill=BLUE, anchor="middle", weight=600)
    # fonn: last tegnet som høyde (1 kN/m2 = 2,6 mm)
    ks = 2.6
    ls = sn["ls"]
    peak, base = sn["peak"], sn["base"]
    se = peak - (peak - base) * b2 / ls
    snow_pts = [(x0, y0), (x0, y0 - peak * ks), (x0 + b2 * k, y0 - se * ks), (x0 + b2 * k, y0)]
    s.poly(snow_pts, None, fill="#f3f8fd", close=True)
    s.dots_poly(snow_pts)
    s.poly(snow_pts, (BLUE, 0.3, None), fill="none", close=True)
    # forlengelse til ls (stiplet)
    s.line(x0 + b2 * k, y0 - se * ks, x0 + ls * k, y0 - base * ks, (BLUE, 0.2, "2 1.2"))
    s.line(x0 + ls * k, y0 - base * ks, x0 + ls * k, y0, (BLUE, 0.2, "2 1.2"))
    s.line(x0 + b2 * k, y0, x0 + ls * k, y0, (INK3, 0.15, "2 1.2"))
    # jevn snø mu1*sk
    s.line(x0, y0 - base * ks, x0 + b2 * k, y0 - base * ks, (BLUE, 0.2, "0.8 0.8"))
    s.text(x0 + b2 * k + 1.5, y0 - se * ks - 1.0, f"{num(se, 1)} kN/m²", size=T_S, fill=BLUE, weight=600)
    s.text(x0 + ls * k - 1.5, y0 - base * ks + 4.2, f"μ_{{1}}·s_{{k}} = 0,8 · {num(sn['sk'], 1)} = {num(base, 1)} kN/m²", size=T_S, fill=BLUE, anchor="end")
    s.text(x0 + 1.5, y0 - peak * ks - 1.6, f"γ·h = 2,0 · 3,72 = {num(peak)} kN/m² ved veggen", size=T_S, fill=BLUE,
           weight=700)
    # h og ls
    s.dim((x0 - 4.2 * k - 0.0, y0), (x0 - 4.2 * k - 0.0, y0 - h * k), 6.0, "h = 3,72 (ved mønet)", size=T_S, side=1)
    s.dim((x0, y0 + 11.0), (x0 + ls * k, y0 + 11.0), 0, f"l_{{s}} = 2h = {num(ls)} m", ext=False, size=T_S)
    # takbjelkene på B2
    for xj, lab in ((0.30, "0,30"), (0.90, "0,90")):
        s.line(x0 + xj * k, y0, x0 + xj * k, y0 - (peak - (peak - base) * xj / ls) * ks, (INK, 0.3, "1.2 0.8"))
    s.text(x0 + 0.60 * k, y0 - 9.5, "takbjelkene", size=T_XS, fill=INK, anchor="middle", halo=1.4, weight=600)
    s.text(x0 + 0.60 * k, y0 - 6.6, "på B2 (0,30 og", size=T_XS, fill=INK, anchor="middle", halo=1.4, weight=600)
    s.text(x0 + 0.60 * k, y0 - 3.7, "0,90 m fra veggen)", size=T_XS, fill=INK, anchor="middle", halo=1.4, weight=600)
    s.save(path)


def fig_path(path):
    """Lastveier med status: grønn = regnet/kontrollert, gul = regnet med antakelse, rød = ikke dokumentert."""
    s = Fig(170, 86)
    ASC, NDC = AMBER, RED
    bw, bh, gap = 25.5, 11.0, 3.2

    def box(x, y, title, sub, color, w=bw):
        s.rect(x, y, w, bh, (color, 0.4, None), fill=PAPER, rx=1.4)
        s.rect(x, y, 1.2, bh, None, fill=color)
        s.text(x + 2.6, y + 4.4, title, size=T_S, weight=700)
        for i, ln in enumerate(sub):
            s.text(x + 2.6, y + 7.4 + i * 2.5, ln, size=1.9, fill=INK2)

    def chain(y, label, r, boxes):
        s.text(2.0, y + 4.6, label, size=T_M, weight=700, fill=STEEL)
        s.text(2.0, y + 8.2, r, size=T_XS, fill=RED, weight=700)
        x = 21.0
        for i, (t, sub, c) in enumerate(boxes):
            box(x, y, t, sub, c)
            if i < len(boxes) - 1:
                s.arrow(x + bw + 0.3, y + bh / 2, x + bw + gap - 0.3, y + bh / 2, color=INK2, lw=0.3, head=1.6)
            x += bw + gap

    b1, b2, su = R["B1"], R["B2"], R["supports"]
    w0 = su["web"]["FRd_ss0"]
    stu = su["studs"]
    c9 = su["c90"]

    def steg(F):
        return ("Stålbjelke", ["steg ved opplegg", f"≤ {num(F / w0 * 100, 0)} % (S235 antatt)"], ASC)

    def stend(key, dim):
        return (dim, ["stendere, fastholdt", f"{num(stu[key]['C24']['util_strong'] * 100, 0)}–{num(stu[key]['C24']['util_ecc'] * 100, 0)} % (C24 antatt)"], ASC)

    def stokk(key):
        return ("Tømmerstokk", ["148×148, trykk ⊥ fiber", f"{num(c9[key]['C24']['util'] * 100, 0)}–{num(c9[key]['C24']['util_98'] * 100, 0)} % (C24 antatt)"], ASC)

    s.text(2.0, 5.0, "Lastveier fra stålbjelkene ned til grunnen – med dokumentasjonsstatus", size=T_M, weight=700)
    chain(9.0, "B1 · O1", f"{num(b1['VEd'], 1)} kN", [
        steg(b1["VEd"]), stend("B1_pipe", "2 × 48×98"),
        ("Gulvbjelke", ["48×196, trykk ⊥ fiber", "flate ikke dokumentert"], NDC),
        ("IPN 200", ["lastpunkt over kloss;", f"verste fall {num(su['ipn']['util'] * 100, 0)} %"], ASC),
        ("Betongkloss", ["0,90 m; underlag", "ikke dokumentert"], NDC),
    ])
    chain(27.5, "B1 · O2", f"{num(b1['VEd'], 1)} kN", [
        steg(b1["VEd"]), stend("B1_wall", "2 × 48×148"), stokk("B1_wall"),
        ("Grunnmur", ["ca. 0,25 m; tilstand", "ikke undersøkt"], ASC),
    ])
    chain(46.0, "B2 · O3", f"{num(b2['RA'], 1)} kN", [
        steg(b2["RA"]), stend("B2_wall", "2 × 48×148"), stokk("B2_wall"),
        ("Grunnmur", ["ca. 0,25 m; tilstand", "ikke undersøkt"], ASC),
    ])
    chain(64.5, "B2 · O4", f"{num(b2['RB'], 1)} kN", [
        steg(b2["RB"]), stend("B2_col", "2 × 48×98"),
        ("Gulvbjelke", ["48×196 + kubbinger,", "flate ikke dokumentert"], NDC),
        ("Stolpesko", ["plate 400 mm; type", "ikke dokumentert"], NDC),
        ("Betongsøyle", ["Ø ca. 200; fundament", "ikke dokumentert"], NDC),
    ])
    # forklaring
    yl = 80.5
    x = 21.0
    for color, txt in ((ASC, "regnet eller vurdert med antakelse (materialklasse, fastholding)"),
                       (NDC, "ikke dokumentert – må kontrollmåles")):
        s.rect(x, yl - 2.4, 3.2, 3.2, None, fill=color, rx=0.6)
        s.text(x + 4.6, yl + 0.2, txt, size=T_XS, fill=INK2)
        x += text_w(txt, T_XS) + 12.0
    s.save(path)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "fig")
    os.makedirs(out, exist_ok=True)
    fig_b1(os.path.join(out, "fig_b1.svg"))
    fig_b2(os.path.join(out, "fig_b2.svg"))
    fig_snow(os.path.join(out, "fig_snow.svg"))
    fig_path(os.path.join(out, "fig_path.svg"))
    print("skrev figurer til", out)
