"""calc.py – beregningsgrunnlag for stålbjelkene B1 og B2.

Én felles tallkilde for tegninger og beregningsnotat. Kjør:  python3 calc.py  -> results.json

Alle forutsetninger står samlet øverst (INNDATA). Enheter: kN, m, kNm; tverrsnitt i mm.
Beregningene er overslag til gjennomgang – ikke godkjent prosjektering.
"""
from __future__ import annotations

import json
import math
import os

# ==========================================================================
# INNDATA
# ==========================================================================
# --- Materialer -------------------------------------------------------------
E = 210_000.0          # N/mm2  stål
G = 80_770.0           # N/mm2  stål
FY = 235.0             # N/mm2  S235 – FORUTSATT, ikke dokumentert
GM0 = 1.05             # NS-EN 1993-1-1 NA
GM1 = 1.05

# IPE 180 (profiltabell)
IPE180 = dict(h=180.0, b=91.0, tw=5.3, tf=8.0, r=9.0, A=2395.0,
              Iy=1317e4, Wel=146.3e3, Wpl=166.4e3,
              Iz=100.9e4, It=4.79e4, Iw=7.431e9, Avz=1125.0, g=0.184)   # g i kN/m (18,8 kg/m)

# Konstruksjonsvirke – fasthetsklasse IKKE dokumentert; C24 antatt, C18 som nedre kontroll
TIMBER = {
    "C24": dict(fc0k=21.0, fc90k=2.5, E005=7400.0, fmk=24.0, fvk=4.0),
    "C18": dict(fc0k=18.0, fc90k=2.2, E005=6000.0, fmk=18.0, fvk=3.4),
}
IPN200 = dict(Wel=214e3, b=90.0)      # profiltabell; stålkvalitet ukjent (S235 antatt)
GM_TIMBER = 1.25       # NS-EN 1995-1-1 NA, konstruksjonstrevirke
KMOD = {"halvår": 0.8, "korttid": 0.9}   # bruksklasse 1; nyttelast = halvårslast, snø = korttidslast (NA)
KC90 = 1.25            # NS-EN 1995-1-1 pkt. 6.1.5, heltre, l1 >= 2h (1,5 tillatt for diskrete opplegg; 1,25 valgt)
BETA_C = 0.2           # heltre

# --- Laster (karakteristiske) ------------------------------------------------
G_FLOOR = 1.2          # kN/m2 etasjeskille (anslått)
Q_FLOOR = 2.0          # kN/m2 nyttelast kategori A
G_TERR = 1.2           # kN/m2 takterrasse inkl. takbjelker og himling (anslått)
Q_TERR = 4.0           # kN/m2 nyttelast takterrasse (som balkong, kategori A)
SK = 5.0               # kN/m2 snølast på mark brukt i følsomhetsregning (Vefsn generelt 5,0; Mosjøen/langs fjorden 4,0)
MU1 = 0.8
GAMMA_SNOW = 2.0       # kN/m3
H_GABLE = 3.72         # m, terrassegulv – underkant mønekasse ved mønet (målt)
B1_UPPER = 11.0        # m, lengde øvre bygg (2. etasje) vinkelrett på gavlen
B2_LOWER = 4.1         # m, terrassens utstrekning fra gavlveggen (15,1 − 11,0)

# --- Lastfaktorer NS-EN 1990 NA ----------------------------------------------
GG_A, GG_B, GQ = 1.35, 1.2, 1.5
PSI0_A, PSI0_S = 0.7, 0.7

# --- B1 -----------------------------------------------------------------------
B1 = dict(L=3.63, bw=2.55, bw_cont=None, wall=0.5, spans=(3.60, 1.50), stud_h=2.07)
# --- B2 -----------------------------------------------------------------------
B2 = dict(L=3.40, stud_h=2.22,
          floor_x=(0.10, 2.10), floor_bw=0.75, trimmer=0.5,
          stair_P=3.0, stair_x=1.20,
          gable_P=5.0, gable_x=2.25,
          joist_x=(2.55, 3.15), joist_cc=0.60, joist_spans=(1.50, 1.65))

DEFL_LIMIT = 300.0     # L/300 – valgt kontrollgrense
BEARING = 98.0         # mm oppleggslengde


# ==========================================================================
# Hjelpefunksjoner
# ==========================================================================
def two_span_mid_reaction(l1: float, l2: float) -> float:
    """Midtopplegg-reaksjon per enhetslast for to-felts sammenhengende bjelke (m per kN/m)."""
    mb = (l1 ** 3 + l2 ** 3) / (8.0 * (l1 + l2))
    return (l1 + l2) / 2.0 + mb * (1.0 / l1 + 1.0 / l2)


class Beam:
    """Fritt opplagt bjelke med punktlaster og delvis fordelte laster (kN, m)."""

    def __init__(self, L: float):
        self.L = L
        self.points: list[tuple[float, float]] = []          # (x, P)
        self.udls: list[tuple[float, float, float]] = []      # (x1, x2, w)

    def point(self, x, P):
        if P:
            self.points.append((x, P))

    def udl(self, x1, x2, w):
        if w:
            self.udls.append((x1, x2, w))

    def reactions(self):
        tot = sum(P for _, P in self.points) + sum(w * (b - a) for a, b, w in self.udls)
        mom = sum(P * x for x, P in self.points) + sum(w * (b - a) * (a + b) / 2 for a, b, w in self.udls)
        rb = mom / self.L
        return tot - rb, rb

    def V(self, x):
        ra, _ = self.reactions()
        v = ra
        for xp, P in self.points:
            if xp < x:
                v -= P
        for a, b, w in self.udls:
            if x > a:
                v -= w * (min(x, b) - a)
        return v

    def M(self, x):
        ra, _ = self.reactions()
        m = ra * x
        for xp, P in self.points:
            if xp < x:
                m -= P * (x - xp)
        for a, b, w in self.udls:
            if x > a:
                l = min(x, b) - a
                m -= w * l * (x - a - l / 2)
        return m

    def max_M(self, n=3400):
        best = (0.0, 0.0)
        for i in range(n + 1):
            x = self.L * i / n
            m = self.M(x)
            if m > best[1]:
                best = (x, m)
        # kandidater i lastpunkter
        for xp, _ in self.points:
            m = self.M(xp)
            if m > best[1]:
                best = (xp, m)
        return best

    def deflection(self, EI_kNm2: float, n=3400):
        """Nedbøyning ved numerisk dobbelintegrasjon. Returnerer (x_maks, delta_maks [m], liste)."""
        dx = self.L / n
        xs = [i * dx for i in range(n + 1)]
        k = [self.M(x) / EI_kNm2 for x in xs]
        # integrer krumning to ganger (trapes)
        th = [0.0]
        for i in range(1, n + 1):
            th.append(th[-1] + (k[i - 1] + k[i]) / 2 * dx)
        y = [0.0]
        for i in range(1, n + 1):
            y.append(y[-1] + (th[i - 1] + th[i]) / 2 * dx)
        # randbetingelse y(L) = 0  ->  trekk fra lineært ledd
        c = y[-1] / self.L
        d = [c * x - yy for x, yy in zip(xs, y)]
        i_max = max(range(n + 1), key=lambda i: d[i])
        return xs[i_max], d[i_max], list(zip(xs, d))

    def curves(self, n=340):
        xs = [self.L * i / n for i in range(n + 1)]
        return [(x, self.V(x + 1e-9) if x < self.L else self.V(x - 1e-9), self.M(x)) for x in xs]


def steel_section_resistances(sec=IPE180):
    return dict(
        MRd_el=sec["Wel"] * FY / GM0 / 1e6,
        MRd_pl=sec["Wpl"] * FY / GM0 / 1e6,
        VRd=sec["Avz"] * FY / math.sqrt(3) / GM0 / 1e3,
        EI=E * sec["Iy"] / 1e9,          # kNm2
    )


def ltb(L_m: float, sec=IPE180, C1=1.127, C2=0.454, top_flange=True):
    """Vipping uten sideavstivning mellom gaffellagrede opplegg (NS-EN 1993-1-1 pkt. 6.3.2)."""
    L = L_m * 1000.0
    zg = sec["h"] / 2 if top_flange else 0.0
    pi2EIz = math.pi ** 2 * E * sec["Iz"] / L ** 2          # N
    root = sec["Iw"] / sec["Iz"] + L ** 2 * G * sec["It"] / (math.pi ** 2 * E * sec["Iz"])
    Mcr = C1 * pi2EIz * (math.sqrt(root + (C2 * zg) ** 2) - C2 * zg) / 1e6   # kNm
    Mpl = sec["Wpl"] * FY / 1e6
    lam = math.sqrt(Mpl / Mcr)
    # 6.3.2.2 generelt tilfelle, h/b <= 2 -> kurve a (alfa = 0,21)
    a = 0.21
    phi = 0.5 * (1 + a * (lam - 0.2) + lam ** 2)
    chi_gen = min(1.0, 1 / (phi + math.sqrt(phi ** 2 - lam ** 2)))
    # 6.3.2.3 valsede profiler, h/b <= 2 -> kurve b (alfa = 0,34), lam0 = 0,4, beta = 0,75
    a2, lam0, beta = 0.34, 0.4, 0.75
    phi2 = 0.5 * (1 + a2 * (lam - lam0) + beta * lam ** 2)
    chi_r = min(1.0, 1 / lam ** 2, 1 / (phi2 + math.sqrt(phi2 ** 2 - beta * lam ** 2)))
    kc = 0.94                                   # jevnt fordelt last (tabell 6.6)
    f = min(1.0, 1 - 0.5 * (1 - kc) * (1 - 2.0 * (lam - 0.8) ** 2))
    chi_mod = min(1.0, 1 / lam ** 2, chi_r / f)
    return dict(Mcr=Mcr, lam=lam, chi_6322=chi_gen, chi_6323=chi_mod,
                MbRd_6322=chi_gen * Mpl / GM1, MbRd_6323=chi_mod * Mpl / GM1,
                C1=C1, C2=C2, zg=zg)


def ltb_segment(Lseg_m: float, sec=IPE180):
    """Vipping for et bjelkesegment mellom to fastholdingspunkter. Sikker side: konstant moment (C1 = 1,0)
    og last på overflens (C2 = 0,454). Returnerer kapasitet etter 6.3.2.2 (kurve a)."""
    L = Lseg_m * 1000.0
    zg = sec["h"] / 2
    pi2EIz = math.pi ** 2 * E * sec["Iz"] / L ** 2
    root = sec["Iw"] / sec["Iz"] + L ** 2 * G * sec["It"] / (math.pi ** 2 * E * sec["Iz"])
    Mcr = 1.0 * pi2EIz * (math.sqrt(root + (0.454 * zg) ** 2) - 0.454 * zg) / 1e6
    Mpl = sec["Wpl"] * FY / 1e6
    lam = math.sqrt(Mpl / Mcr)
    phi = 0.5 * (1 + 0.21 * (lam - 0.2) + lam ** 2)
    chi = min(1.0, 1 / (phi + math.sqrt(phi ** 2 - lam ** 2)))
    return dict(Lseg=Lseg_m, Mcr=Mcr, lam=lam, chi=chi, MbRd=chi * Mpl / GM1)


def web_bearing(ss=BEARING, sec=IPE180, c=0.0):
    """Steg under konsentrert oppleggskraft, endeopplegg uten stivere (NS-EN 1993-1-5 kap. 6, type c)."""
    tw, tf, b = sec["tw"], sec["tf"], sec["b"]
    hw = sec["h"] - 2 * tf
    kF = min(6.0, 2 + 6 * (ss + c) / hw)
    Fcr = 0.9 * kF * E * tw ** 3 / hw
    m1 = b / tw                                   # fyf = fyw
    le = min(ss + c, kF * E * tw ** 2 / (2 * FY * hw))

    def ly_of(m2):
        l10 = ss + 2 * tf * (1 + math.sqrt(m1 + m2))
        l11 = le + tf * math.sqrt(m1 / 2 + (le / tf) ** 2 + m2)
        l12 = le + tf * math.sqrt(m1 + m2)
        return min(l10, l11, l12)

    m2 = 0.02 * (hw / tf) ** 2
    ly = ly_of(m2)
    lamF = math.sqrt(ly * tw * FY / Fcr)
    if lamF <= 0.5:
        m2 = 0.0
        ly = ly_of(m2)
        lamF = math.sqrt(ly * tw * FY / Fcr)
    chiF = min(1.0, 0.5 / lamF)
    FRd = FY * chiF * ly * tw / GM1 / 1e3
    # nedre variant: ss = 0 i ligning (6.10) dersom opplegget ikke følger bjelkens endevinkel (pkt. 6.3)
    ly0 = min(2 * tf * (1 + math.sqrt(m1)), ly)
    lamF0 = math.sqrt(ly0 * tw * FY / Fcr)
    FRd0 = FY * min(1.0, 0.5 / lamF0) * ly0 * tw / GM1 / 1e3
    return dict(kF=kF, Fcr=Fcr / 1e3, ly=ly, lamF=lamF, chiF=chiF, FRd=FRd, hw=hw, ly_ss0=ly0, FRd_ss0=FRd0)


def stud_capacity(b, h, height_m, n=2, cls="C24", kmod=0.8, axis="strong"):
    """Trykkapasitet (kN) for n stendere b x h (mm). axis='strong': knekking om sterk akse (fastholdt i
    svak retning); 'weak': knekking om svak akse (ikke fastholdt)."""
    t = TIMBER[cls]
    d = h if axis == "strong" else b
    i = d / math.sqrt(12)
    lam = height_m * 1000 / i
    lrel = lam / math.pi * math.sqrt(t["fc0k"] / t["E005"])
    k = 0.5 * (1 + BETA_C * (lrel - 0.3) + lrel ** 2)
    kc = 1.0 if lrel <= 0.3 else min(1.0, 1 / (k + math.sqrt(k ** 2 - lrel ** 2)))
    fc0d = kmod * t["fc0k"] / GM_TIMBER
    fmd = kmod * t["fmk"] / GM_TIMBER
    return dict(lam=lam, lrel=lrel, kc=kc, fc0d=fc0d, fmd=fmd, NRd=n * kc * fc0d * b * h / 1e3)


def stud_util_ecc(N_kN, b, h, cap, n=2, e_mm=None):
    """Utnyttelse med eksentrisk last (bjelkens endevinkel flytter kraften): e = oppleggslengde/6.
    NS-EN 1995-1-1 lign. (6.23): sigma_c/(kc fc0d) + sigma_m/fmd."""
    e = BEARING / 6.0 if e_mm is None else e_mm
    W = n * b * h ** 2 / 6.0
    return N_kN / cap["NRd"] + (N_kN * 1e3 * e / W) / cap["fmd"]


def c90_resistance_stress(cls="C24", kmod=0.8):
    return KC90 * kmod * TIMBER[cls]["fc90k"] / GM_TIMBER


# ==========================================================================
# B1
# ==========================================================================
def calc_b1(bw: float, g_floor: float = G_FLOOR, wall: float | None = None):
    L = B1["L"]
    wall = B1["wall"] if wall is None else wall
    g = g_floor * bw + wall + IPE180["g"]
    q = Q_FLOOR * bw
    res = steel_section_resistances()
    out = dict(L=L, bw=bw, gk=g, qk=q,
               g_parts=dict(floor=g_floor * bw, wall=wall, steel=IPE180["g"]))
    combos = {
        "forenklet": GG_A * g + GQ * q,
        "6.10a": GG_A * g + GQ * PSI0_A * q,
        "6.10b": GG_B * g + GQ * q,
    }
    out["qEd"] = combos
    for name, w in combos.items():
        out[f"MEd_{name}"] = w * L ** 2 / 8
        out[f"VEd_{name}"] = w * L / 2
    out["MEd"] = out["MEd_forenklet"]
    out["VEd"] = out["VEd_forenklet"]
    out["MEd_610"] = max(out["MEd_6.10a"], out["MEd_6.10b"])
    out["VEd_610"] = max(out["VEd_6.10a"], out["VEd_6.10b"])
    out["util_M"] = out["MEd"] / res["MRd_el"]
    out["util_M_pl"] = out["MEd"] / res["MRd_pl"]
    out["util_M_610"] = out["MEd_610"] / res["MRd_el"]
    out["util_M_610_pl"] = out["MEd_610"] / res["MRd_pl"]
    out["util_V"] = out["VEd"] / res["VRd"]
    out["dq_reserve"] = res["MRd_el"] * 8 / L ** 2 - out["qEd"]["forenklet"]     # kN/m ekstra dim. last til 100 %
    EI = res["EI"]
    out["delta_gq"] = 5 * (g + q) * L ** 4 / (384 * EI) * 1000
    out["delta_q"] = 5 * q * L ** 4 / (384 * EI) * 1000
    out["delta_lim"] = L * 1000 / DEFL_LIMIT
    out["util_delta"] = out["delta_gq"] / out["delta_lim"]
    out["L_over_delta"] = L * 1000 / out["delta_gq"]
    out["L_over_delta_q"] = L * 1000 / out["delta_q"]
    return out


# ==========================================================================
# B2
# ==========================================================================
def snow_drift(sk=SK, h=H_GABLE, b1=B1_UPPER, b2=B2_LOWER):
    """Snøfonn på tak inntil høyere byggverk, NS-EN 1991-1-3 pkt. 5.3.6 (uten ras: mønet står vinkelrett på gavlen)."""
    mu_w_geo = (b1 + b2) / (2 * h)
    mu_w_cap = GAMMA_SNOW * h / sk
    mu_w = max(0.8, min(mu_w_geo, mu_w_cap, 4.0))
    mu2 = mu_w                      # mu_s = 0
    ls = min(15.0, max(5.0, 2 * h))
    peak = mu2 * sk
    base = MU1 * sk

    def s_at(x):
        if x >= ls:
            return base
        return peak - (peak - base) * x / ls
    return dict(sk=sk, mu_w_geo=mu_w_geo, mu_w_cap=mu_w_cap, mu_w=mu_w, mu2=mu2, ls=ls, peak=peak, base=base,
                s_030=s_at(0.30), s_090=s_at(0.90), s_edge=s_at(b2), cap_governs=mu_w_cap <= mu_w_geo,
                sk_limit=2 * GAMMA_SNOW * h * h / (b1 + b2))


def b2_loads(case: str, *, s_terr: float | None = None, floor_bw=None, extra_gable=(0.0, 0.0), stair_x=None,
             gable_P=None, strips=None):
    """Karakteristiske laster på B2 som liste av (type, kategori, x1, x2, verdi, tekst).
    kategori: G, A (nyttelast gulv/trapp), T (nyttelast terrasse), S (snø).
    case: 'snø' eller 'terrasse'."""
    d = B2
    kR = two_span_mid_reaction(*d["joist_spans"])      # m
    area = kR * d["joist_cc"]                          # m2 per takbjelke på B2
    fbw = d["floor_bw"] if floor_bw is None else floor_bw
    x1, x2 = d["floor_x"]
    loads = [
        ("udl", "G", 0.0, d["L"], IPE180["g"], "Egenvekt IPE 180"),
        ("udl", "G", x1, x2, G_FLOOR * fbw + d["trimmer"], "Gulv via veksling – egenlast"),
        ("udl", "A", x1, x2, Q_FLOOR * fbw, "Gulv via veksling – nyttelast"),
        ("pt", "A", d["stair_x"] if stair_x is None else stair_x, None, d["stair_P"], "Trapp (anslått)"),
        ("pt", "G", d["gable_x"], None, (d["gable_P"] if gable_P is None else gable_P) + extra_gable[0],
         "Gavlvegg 2. etasje – egenvekt (anslått)"),
    ]
    # strips: lastbredde (m) for bjelken under gavlveggen og for de to takbjelkene; standard (0, 0,60, 0,60)
    st = (0.0, d["joist_cc"], d["joist_cc"]) if strips is None else strips
    s_val = s_terr if case == "snø" else Q_TERR
    s_cat = "S" if case == "snø" else "T"
    if st[0]:
        loads.append(("pt", "G", d["gable_x"], None, kR * st[0] * G_TERR, "Stripe ved gavl – egenlast terrasse"))
        loads.append(("pt", s_cat, d["gable_x"], None, kR * st[0] * s_val, "Stripe ved gavl – snø/bruk"))
    if extra_gable[1]:
        loads.append(("pt", "S", d["gable_x"], None, extra_gable[1], "Takstripe ved gavl – snø (følsomhet)"))
    for xj, bw_j in zip(d["joist_x"], st[1:]):
        aj = kR * bw_j
        loads.append(("pt", "G", xj, None, aj * G_TERR, f"Takbjelke x = {xj:.2f} – egenlast terrasse"))
        if case == "snø":
            loads.append(("pt", "S", xj, None, aj * s_terr, f"Takbjelke x = {xj:.2f} – snøfonn"))
        else:
            loads.append(("pt", "T", xj, None, aj * Q_TERR, f"Takbjelke x = {xj:.2f} – terrassebruk"))
    return loads, dict(kR=kR, area=area)


COMBOS = {
    # navn: faktor per kategori
    "forenklet": dict(G=GG_A, A=GQ, T=GQ, S=GQ),
    "6.10a": dict(G=GG_A, A=GQ * PSI0_A, T=GQ * PSI0_A, S=GQ * PSI0_S),
    "6.10b-snø": dict(G=GG_B, A=GQ * PSI0_A, T=GQ * PSI0_A, S=GQ),
    "6.10b-nytte": dict(G=GG_B, A=GQ, T=GQ, S=GQ * PSI0_S),
    "kar": dict(G=1.0, A=1.0, T=1.0, S=1.0),
    "kar-var": dict(G=0.0, A=1.0, T=1.0, S=1.0),
}


def build_beam(loads, factors, L=B2["L"]):
    bm = Beam(L)
    for typ, cat, a, b, val, _ in loads:
        f = factors[cat]
        if typ == "udl":
            bm.udl(a, b, val * f)
        else:
            bm.point(a, val * f)
    return bm


def calc_b2(case="snø", **kw):
    res = steel_section_resistances()
    drift = snow_drift()
    s = GAMMA_SNOW * H_GABLE if case == "snø" else None     # jevnt 7,44 på begge takbjelkene (sikker side)
    loads, info = b2_loads(case, s_terr=s, **kw)
    out = dict(case=case, L=B2["L"], loads=[dict(type=t, cat=c, x1=a, x2=b, val=v, text=txt)
                                           for t, c, a, b, v, txt in loads], **info)
    out["s_terr"] = s
    for name, fac in COMBOS.items():
        bm = build_beam(loads, fac)
        ra, rb = bm.reactions()
        xm, mm = bm.max_M()
        out[name] = dict(RA=ra, RB=rb, x_M=xm, MEd=mm)
    # dimensjonerende: forenklet
    bm = build_beam(loads, COMBOS["forenklet"])
    out["RA"], out["RB"] = bm.reactions()
    out["x_M"], out["MEd"] = bm.max_M()
    out["VEd"] = max(out["RA"], out["RB"])
    out["util_M"] = out["MEd"] / res["MRd_el"]
    out["util_V"] = out["VEd"] / res["VRd"]
    out["MEd_610"] = max(out[k]["MEd"] for k in ("6.10a", "6.10b-snø", "6.10b-nytte"))
    out["RB_610"] = max(out[k]["RB"] for k in ("6.10a", "6.10b-snø", "6.10b-nytte"))
    out["RA_610"] = max(out[k]["RA"] for k in ("6.10a", "6.10b-snø", "6.10b-nytte"))
    out["curves"] = [dict(x=round(x, 4), V=round(v, 3), M=round(m, 3)) for x, v, m in bm.curves(340)]
    # nedbøyning (karakteristisk)
    bk = build_beam(loads, COMBOS["kar"])
    xd, dm, _ = bk.deflection(res["EI"])
    out["delta_gq"], out["x_delta"] = dm * 1000, xd
    bv = build_beam(loads, COMBOS["kar-var"])
    _, dv, _ = bv.deflection(res["EI"])
    out["delta_q"] = dv * 1000
    out["delta_lim"] = B2["L"] * 1000 / DEFL_LIMIT
    out["util_delta"] = out["delta_gq"] / out["delta_lim"]
    out["L_over_delta"] = B2["L"] * 1000 / out["delta_gq"]
    # design-laster for presentasjon (forenklet)
    fac = COMBOS["forenklet"]
    pres = {}
    for t, c, a, b, v, txt in loads:
        key = (t, a, b)
        pres.setdefault(key, dict(type=t, x1=a, x2=b, gk=0.0, qk=0.0, Ed=0.0, texts=[]))
        if c == "G":
            pres[key]["gk"] += v
        else:
            pres[key]["qk"] += v
        pres[key]["Ed"] += v * fac[c]
        pres[key]["texts"].append(txt)
    out["design_loads"] = list(pres.values())
    return out


# ==========================================================================
# Opplegg
# ==========================================================================
SUPPORTS = dict(      # nøkkel: (navn, stender b, h, høyde, kontaktlengde langs fiber for trykk ⊥ fiber [mm])
    B1_pipe=("O1", 48, 98, B1["stud_h"]),
    B1_wall=("O2", 48, 148, B1["stud_h"]),
    B2_wall=("O3", 48, 148, B2["stud_h"]),
    B2_col=("O4", 48, 98, B2["stud_h"]),
)


def calc_supports(R, dur, R610=None):
    """R: dimensjonerende oppleggskrefter {nøkkel: kN}. dur: lastvarighet {nøkkel: 'halvår'|'korttid'}."""
    out = dict(R=R, dur=dur, web=web_bearing())
    if R610:
        out["R_610"] = R610
    # --- stendere
    studs = {}
    for key, (name, b, h, hh) in SUPPORTS.items():
        d = dict(b=b, h=h, height=hh)
        for cls in ("C24", "C18"):
            km = KMOD[dur[key]]
            strong = stud_capacity(b, h, hh, cls=cls, kmod=km, axis="strong")
            weak = stud_capacity(b, h, hh, cls=cls, kmod=km, axis="weak")
            d[cls] = dict(strong=strong, weak=weak, util_strong=R[key] / strong["NRd"], util_weak=R[key] / weak["NRd"],
                          util_ecc=stud_util_ecc(R[key], b, h, strong))
        d["sigma_c0"] = R[key] * 1e3 / (IPE180["b"] * BEARING)     # endeved-trykk mellom stålflens og stendertopp
        studs[key] = d
    out["studs"] = studs
    # --- trykk vinkelrett på fiber
    c90 = {}
    for key in R:
        km = KMOD[dur[key]]
        d = dict(kmod=km)
        for cls in ("C24", "C18"):
            fRd = c90_resistance_stress(cls, km)                   # med kc,90 = 1,25
            d[cls] = dict(fRd=fRd, A_req=R[key] * 1e3 / fRd, A_req_kc1=R[key] * 1e3 / (fRd / KC90))
        c90[key] = d
    # tømmerstokk 148 x 148 under 2 x 48 x 148: hele stenderbredden (148) eller bare oppleggsbredden (98)
    for key in ("B1_wall", "B2_wall"):
        A148, A98 = (96 + 60) * 148.0, (96 + 60) * 98.0
        c90[key].update(A_ef=A148, sigma=R[key] * 1e3 / A148, A_ef_98=A98, sigma_98=R[key] * 1e3 / A98)
        for cls in ("C24", "C18"):
            c90[key][cls]["util"] = c90[key]["sigma"] / c90[key][cls]["fRd"]
            c90[key][cls]["util_98"] = c90[key]["sigma_98"] / c90[key][cls]["fRd"]
    # gulvbjelke 48 x 196 under 2 x 48 x 98
    #   flate A: stendere -> gulvbjelke, kontaktlengde 96 mm; flate B (bare O1): gulvbjelke -> IPN-flens, 90 mm
    for key in ("B1_pipe", "B2_col"):
        A_a = 48.0 * (96 + 60)
        A_b = 48.0 * (IPN200["b"] + 60) if key == "B1_pipe" else A_a
        A_min = min(A_a, A_b)
        A_blk = 98.0 * (96 + 60)
        c90[key].update(A_joist_only=A_a, A_flange=A_b, A_min=A_min, A_with_blocking=A_blk,
                        sigma_joist_only=R[key] * 1e3 / A_a, sigma_min=R[key] * 1e3 / A_min,
                        sigma_with_blocking=R[key] * 1e3 / A_blk)
        for cls in ("C24", "C18"):
            f = c90[key][cls]["fRd"]
            c90[key][cls].update(util_joist_only=c90[key]["sigma_joist_only"] / f, util_min=c90[key]["sigma_min"] / f,
                                 util_with_blocking=c90[key]["sigma_with_blocking"] / f,
                                 util_with_blocking_kc1=c90[key]["sigma_with_blocking"] / (f / KC90))
    out["c90"] = c90
    # --- skjærkapasitet for én gulvbjelke 48 x 196 (kan ikke føre oppleggskraften sideveis)
    sh = {}
    for key in ("B1_pipe", "B2_col"):
        fvd = KMOD[dur[key]] * TIMBER["C24"]["fvk"] / GM_TIMBER
        sh[key] = dict(VRd_kcr067=2 / 3 * 0.67 * 48 * 196 * fvd / 1e3, VRd_kcr1=2 / 3 * 48 * 196 * fvd / 1e3)
    out["joist_shear"] = sh
    # --- betongsøyle Ø200 og grunntrykk uten utvidet fundament
    A_col = math.pi * 100 ** 2
    out["column"] = dict(d=200.0, A=A_col, sigma=R["B2_col"] * 1e3 / A_col, q_ground=R["B2_col"] / (A_col / 1e6))
    # --- IPN 200: verste fall dersom lasten ved O1 måtte føres 0,60 m i bøyning til klossens kant
    M_ipn = R["B1_pipe"] * 0.60
    MRd_ipn = IPN200["Wel"] * FY / GM0 / 1e6
    out["ipn"] = dict(M=M_ipn, MRd=MRd_ipn, util=M_ipn / MRd_ipn)
    return out


# ==========================================================================
# Sideavstivning – nødvendig fastholdingskraft vs. friksjon (vurdering)
# ==========================================================================
def restraint(b, load_on_flange_kN, L_m, seg_m):
    lever = (IPE180["h"] - IPE180["tf"]) / 1000.0
    Nf = b["MEd"] / lever                                   # trykkraft i overflens
    seg = ltb_segment(seg_m)
    return dict(Nf=Nf, F_25pct=0.025 * Nf, load=load_on_flange_kN,
                mu_req=0.025 * Nf / load_on_flange_kN, friction_02=0.2 * load_on_flange_kN,
                seg=seg, util_seg=b["MEd"] / seg["MbRd"])


# ==========================================================================
# Kjøring
# ==========================================================================
def main():
    res = steel_section_resistances()
    b1 = calc_b1(B1["bw"])
    bw_cont = two_span_mid_reaction(*B1["spans"])
    b1s = calc_b1(bw_cont)
    b1["ltb"] = ltb(B1["L"])
    b1["util_ltb_6322"] = b1["MEd"] / b1["ltb"]["MbRd_6322"]
    b1["util_ltb_6323"] = b1["MEd"] / b1["ltb"]["MbRd_6323"]
    b1s["util_ltb_6322"] = b1s["MEd"] / b1["ltb"]["MbRd_6322"]
    b1s["util_ltb_6323"] = b1s["MEd"] / b1["ltb"]["MbRd_6323"]
    # last på flensen uten bjelkens egenvekt; ett fastholdingspunkt midt i spennet gir segment L/2
    b1["restraint"] = restraint(b1, (b1["qEd"]["forenklet"] - GG_A * IPE180["g"]) * B1["L"], B1["L"], B1["L"] / 2)

    # B1 – bodveggens andel og tyngre etasjeskille
    l1, l2, a = B1["spans"][0], B1["spans"][1], 0.5
    bb = l2 - a
    mb = a * bb * (l2 + bb) / (2 * l2 * (l1 + l2))
    wall_w = B1["wall"] / (bb / l2)                         # veggens egen vekt når 0,5 kN/m er B1s andel ved fritt opplegg
    shares = dict(simple=bb / l2, cont=bb / l2 + mb * (1 / l1 + 1 / l2), cant=(l1 + a) / l1)
    b1_wallmax = calc_b1(B1["bw"], wall=wall_w * shares["cant"])
    b1_heavy = calc_b1(B1["bw"], g_floor=2.0)
    b1s_heavy = calc_b1(bw_cont, g_floor=2.0)
    b1x = dict(wall_w=wall_w, shares=shares, wall_on_b1_max=wall_w * shares["cant"],
               wallmax=dict(MEd=b1_wallmax["MEd"], util=b1_wallmax["util_M"]),
               heavy=dict(g_floor=2.0, MEd=b1_heavy["MEd"], util=b1_heavy["util_M"]),
               heavy_cont=dict(MEd=b1s_heavy["MEd"], util=b1s_heavy["util_M"], util_610=b1s_heavy["util_M_610"],
                               util_610_pl=b1s_heavy["util_M_610_pl"]),
               dg_floor_to_100_cont=b1s["dq_reserve"] / (GG_A * bw_cont))

    b2 = calc_b2("snø")
    b2t = calc_b2("terrasse")
    b2["ltb"] = ltb(B2["L"])
    b2["util_ltb_6322"] = b2["MEd"] / b2["ltb"]["MbRd_6322"]
    b2["util_ltb_6323"] = b2["MEd"] / b2["ltb"]["MbRd_6323"]
    load_b2 = b2["RA"] + b2["RB"] - GG_A * IPE180["g"] * B2["L"]
    # ett fastholdingspunkt ved gavlveggen (x = 2,25) gir lengste segment 2,25 m
    b2["restraint"] = restraint(b2, load_b2, B2["L"], B2["gable_x"])

    # robusthet B2
    a2, bb2 = B2["gable_x"], B2["L"] - B2["gable_x"]
    infl = a2 * bb2 / B2["L"]
    rob = dict(infl_gable=infl, dP_to_100=(res["MRd_el"] - b2["MEd"]) / infl)
    # alternativ: lastbredde 1,50 m på x = 0–2,25 uten veksling/trapp separat
    alt_loads, _ = b2_loads("snø", s_terr=GAMMA_SNOW * H_GABLE)
    alt = [l for l in alt_loads if not (l[5].startswith("Gulv via veksling") or l[5].startswith("Trapp"))]
    alt.append(("udl", "G", 0.0, 2.25, G_FLOOR * 1.50, "Gulv, lastbredde 1,50 m – egenlast"))
    alt.append(("udl", "A", 0.0, 2.25, Q_FLOOR * 1.50, "Gulv, lastbredde 1,50 m – nyttelast"))
    bm = build_beam(alt, COMBOS["forenklet"])
    xa, ma = bm.max_M()
    ra_, rb_ = bm.reactions()
    rob["alt_bw150"] = dict(MEd=ma, x=xa, RA=ra_, RB=rb_, util=ma / res["MRd_el"])
    # takstripe ved gavl: 0,6 m stripe, g = 0,7 kN/m2, snø mu1*sk, influenslengde = kR
    strip_b, strip_g = 0.6, 0.7
    kR = two_span_mid_reaction(*B2["joist_spans"])
    Pg = strip_b * strip_g * kR
    Ps = strip_b * MU1 * SK * kR
    b2r = calc_b2("snø", extra_gable=(Pg, Ps))
    rob["roof_strip"] = dict(b=strip_b, g=strip_g, Pg=Pg, Ps=Ps, MEd=b2r["MEd"], RB=b2r["RB"], RA=b2r["RA"],
                             util=b2r["util_M"], delta=b2r["delta_gq"],
                             util_ltb_6322=b2r["MEd"] / b2["ltb"]["MbRd_6322"],
                             util_ltb_6323=b2r["MEd"] / b2["ltb"]["MbRd_6323"])
    # ugunstige anslag samtidig: trapp midt i søndre løp, stripefordeling 0,15/0,45/0,60 og tyngre gavlvegg
    gable_heavy = 1.0 * H_GABLE * kR
    b2u = calc_b2("snø", stair_x=1.61, gable_P=gable_heavy, strips=(0.15, 0.45, 0.60))
    rob["unfav"] = dict(stair_x=1.61, gable_P=gable_heavy, MEd=b2u["MEd"], util=b2u["util_M"], RB=b2u["RB"])
    drift = snow_drift()

    # opplegg: velg lastvarighet etter største F/kmod (snø: korttid, ellers halvår)
    R = dict(B1_pipe=b1["VEd"], B1_wall=b1["VEd"], B2_wall=b2["RA"], B2_col=b2["RB"])
    R610 = dict(B1_pipe=b1["VEd_610"], B1_wall=b1["VEd_610"], B2_wall=b2["RA_610"], B2_col=b2["RB_610"])
    dur = dict(B1_pipe="halvår", B1_wall="halvår")
    for key, f_snow, f_terr in (("B2_wall", b2["RA"], b2t["RA"]), ("B2_col", b2["RB"], b2t["RB"])):
        dur[key] = "korttid" if f_snow / KMOD["korttid"] >= f_terr / KMOD["halvår"] else "halvår"
        if dur[key] == "halvår":
            R[key] = f_terr
    sup = calc_supports(R, dur, R610)
    R_sens = dict(B1_pipe=b1s["VEd"], B1_wall=b1s["VEd"], B2_wall=b2r["RA"], B2_col=b2r["RB"])
    sup_s = calc_supports(R_sens, dur)
    # trykk vinkelrett på fiber i takbjelke (48 mm antatt) mot B2-flensen
    Pj = next(d["Ed"] for d in b2["design_loads"] if d["type"] == "pt" and abs(d["x1"] - B2["joist_x"][0]) < 1e-6)
    A_tj = 48.0 * (IPE180["b"] + 60)
    f_tj = c90_resistance_stress("C24", KMOD["korttid"])
    sup["roof_joist"] = dict(P=Pj, A=A_tj, sigma=Pj * 1e3 / A_tj, fRd=f_tj, util=Pj * 1e3 / A_tj / f_tj,
                             util_kc1=Pj * 1e3 / A_tj / (f_tj / KC90))
    sup["R_kar"] = dict(B2_col=b2["kar"]["RB"], B1_pipe=(b1["gk"] + b1["qk"]) * B1["L"] / 2)

    results = dict(
        meta=dict(sk=SK, fy=FY, gM0=GM0, defl_limit=DEFL_LIMIT, bearing=BEARING),
        section=dict(IPE180=IPE180, **res),
        B1=b1, B1_sens=b1s, B1_extra=b1x, bw_cont=bw_cont,
        B2=b2, B2_terrace=b2t, robust=rob, snow=drift,
        supports=sup, supports_sens=sup_s,
    )
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    return results


def _fmt(v, nd=2):
    return f"{v:.{nd}f}".replace(".", ",")


if __name__ == "__main__":
    r = main()
    s = r["section"]
    print(f"MRd,el = {_fmt(s['MRd_el'])} kNm   MRd,pl = {_fmt(s['MRd_pl'])} kNm   VRd = {_fmt(s['VRd'],1)} kN")
    b = r["B1"]
    print(f"B1: gk {_fmt(b['gk'])} qk {_fmt(b['qk'])} qEd {_fmt(b['qEd']['forenklet'])} (6.10a {_fmt(b['qEd']['6.10a'])}, "
          f"6.10b {_fmt(b['qEd']['6.10b'])})  MEd {_fmt(b['MEd'])} ({_fmt(b['util_M']*100,0)} %)  VEd {_fmt(b['VEd'],1)}  "
          f"δ {_fmt(b['delta_gq'],1)} mm (L/{_fmt(b['L_over_delta'],0)})  δq {_fmt(b['delta_q'],1)} mm")
    l = b["ltb"]
    print(f"    vipping uavstivet: Mcr {_fmt(l['Mcr'])}  λLT {_fmt(l['lam'],3)}  Mb,Rd {_fmt(l['MbRd_6322'])} (6.3.2.2) / "
          f"{_fmt(l['MbRd_6323'])} (6.3.2.3)  -> {_fmt(b['util_ltb_6322']*100,0)} % / {_fmt(b['util_ltb_6323']*100,0)} %")
    bs = r["B1_sens"]
    print(f"B1 følsomhet bw {_fmt(r['bw_cont'],3)}: qEd {_fmt(bs['qEd']['forenklet'])}  MEd {_fmt(bs['MEd'])} "
          f"({_fmt(bs['util_M']*100,0)} %)  δ {_fmt(bs['delta_gq'],1)} mm  VEd {_fmt(bs['VEd'],1)}")
    b = r["B2"]
    print(f"B2 snø: RA {_fmt(b['RA'],1)} RB {_fmt(b['RB'],1)}  MEd {_fmt(b['MEd'])} ved x={_fmt(b['x_M'])} "
          f"({_fmt(b['util_M']*100,0)} %)  δ {_fmt(b['delta_gq'],1)} mm ved x={_fmt(b['x_delta'])} (L/{_fmt(b['L_over_delta'],0)})")
    for k in ("6.10a", "6.10b-snø", "6.10b-nytte"):
        print(f"    {k}: RA {_fmt(b[k]['RA'],1)} RB {_fmt(b[k]['RB'],1)} MEd {_fmt(b[k]['MEd'])}")
    l = b["ltb"]
    print(f"    vipping uavstivet: Mcr {_fmt(l['Mcr'])}  λLT {_fmt(l['lam'],3)}  Mb,Rd {_fmt(l['MbRd_6322'])} / {_fmt(l['MbRd_6323'])}"
          f"  -> {_fmt(b['util_ltb_6322']*100,0)} % / {_fmt(b['util_ltb_6323']*100,0)} %")
    bt = r["B2_terrace"]
    print(f"B2 terrassebruk: RA {_fmt(bt['RA'],1)} RB {_fmt(bt['RB'],1)} MEd {_fmt(bt['MEd'])} ({_fmt(bt['util_M']*100,0)} %)")
    ro = r["robust"]
    print(f"Robusthet: ΔP gavl til 100 % = {_fmt(ro['dP_to_100'],1)} kN;  lastbredde 1,50: MEd {_fmt(ro['alt_bw150']['MEd'])} "
          f"RB {_fmt(ro['alt_bw150']['RB'],1)};  takstripe: Pg {_fmt(ro['roof_strip']['Pg'])} Ps {_fmt(ro['roof_strip']['Ps'])} "
          f"MEd {_fmt(ro['roof_strip']['MEd'])} ({_fmt(ro['roof_strip']['util']*100,0)} %) RB {_fmt(ro['roof_strip']['RB'],1)}")
    sn = r["snow"]
    print(f"Snø: mu_w geo {_fmt(sn['mu_w_geo'])} tak {_fmt(sn['mu_w_cap'])} -> mu2 {_fmt(sn['mu2'])}; topp {_fmt(sn['peak'])} "
          f"ls {_fmt(sn['ls'])}; s(0,3) {_fmt(sn['s_030'])} s(0,9) {_fmt(sn['s_090'])}; sk-grense {_fmt(sn['sk_limit'])}")
    su, ss = r["supports"], r["supports_sens"]
    print(f"Steg: FRd {_fmt(su['web']['FRd'],1)} kN (nedre variant {_fmt(su['web']['FRd_ss0'],1)} kN)")
    for k, d in su["studs"].items():
        print(f"  stendere {k}: C24 sterk {_fmt(d['C24']['strong']['NRd'],1)} kN ({_fmt(d['C24']['util_strong']*100,0)} %), "
              f"m/eksentrisitet {_fmt(d['C24']['util_ecc']*100,0)} % (C18 {_fmt(d['C18']['util_ecc']*100,0)} %), "
              f"svak {_fmt(d['C24']['weak']['NRd'],1)} kN ({_fmt(d['C24']['util_weak']*100,0)} %)")
    for k, d in su["c90"].items():
        print(f"  c90 {k}: R {_fmt(su['R'][k],1)} ({su['dur'][k]}) A_req C24 {_fmt(d['C24']['A_req']/100,0)}–{_fmt(d['C18']['A_req_kc1']/100,0)} cm2; "
              f"følsomhet R {_fmt(ss['R'][k],1)}: {_fmt(ss['c90'][k]['C24']['A_req']/100,0)}–{_fmt(ss['c90'][k]['C18']['A_req_kc1']/100,0)} cm2")
    for k in ("B1_wall", "B2_wall"):
        d = su["c90"][k]
        print(f"  tømmerstokk {k}: {_fmt(d['C24']['util']*100,0)}–{_fmt(d['C24']['util_98']*100,0)} % (C24), C18 {_fmt(d['C18']['util']*100,0)}–{_fmt(d['C18']['util_98']*100,0)} %; "
              f"følsomhet {_fmt(ss['c90'][k]['C24']['util']*100,0)}–{_fmt(ss['c90'][k]['C24']['util_98']*100,0)} %")
    for k in ("B1_pipe", "B2_col"):
        d = su["c90"][k]
        print(f"  gulvbjelke {k}: 48 mm: {_fmt(d['sigma_joist_only'])}–{_fmt(d['sigma_min'])} N/mm2 = {_fmt(d['C24']['util_joist_only']*100,0)}–{_fmt(d['C24']['util_min']*100,0)} %; "
              f"m/kubbing {_fmt(d['C24']['util_with_blocking']*100,0)} % (C18 {_fmt(d['C18']['util_with_blocking']*100,0)} %, kc1 {_fmt(d['C24']['util_with_blocking_kc1']*100,0)} %, "
              f"følsomhet {_fmt(ss['c90'][k]['C24']['util_with_blocking']*100,0)} %); skjær VRd {_fmt(su['joist_shear'][k]['VRd_kcr067'],1)}–{_fmt(su['joist_shear'][k]['VRd_kcr1'],1)} kN")
    print(f"Betongsøyle: σ = {_fmt(su['column']['sigma'])} N/mm2; grunntrykk uten såle {_fmt(su['column']['q_ground'],0)} kN/m2; IPN verste fall {_fmt(su['ipn']['util']*100,0)} %")
    print(f"Takbjelke mot flens: {_fmt(su['roof_joist']['sigma'])} N/mm2 = {_fmt(su['roof_joist']['util']*100,0)} % (kc1 {_fmt(su['roof_joist']['util_kc1']*100,0)} %)")
    x = r["B1_extra"]
    print(f"B1 bodvegg: vegg {_fmt(x['wall_w'])} kN/m, andeler {_fmt(x['shares']['simple'],3)}/{_fmt(x['shares']['cont'],3)}/{_fmt(x['shares']['cant'],3)} -> maks {_fmt(x['wall_on_b1_max'])} kN/m, MEd {_fmt(x['wallmax']['MEd'],1)} ({_fmt(x['wallmax']['util']*100,0)} %)")
    print(f"B1 reserve: {_fmt(r['B1']['dq_reserve'])} kN/m (følsomhet {_fmt(r['B1_sens']['dq_reserve'])} = {_fmt(x['dg_floor_to_100_cont'])} kN/m2); g=2,0: {_fmt(x['heavy']['util']*100,0)} %; "
          f"g=2,0+kont.: {_fmt(x['heavy_cont']['util']*100,0)} % (6.10b {_fmt(x['heavy_cont']['util_610']*100,0)} %, plastisk {_fmt(x['heavy_cont']['util_610_pl']*100,0)} %)")
    print(f"B1 følsomhet uten fastholding: {_fmt(r['B1_sens']['util_ltb_6323']*100,0)}–{_fmt(r['B1_sens']['util_ltb_6322']*100,0)} %; B2 takstripe: {_fmt(ro['roof_strip']['util_ltb_6323']*100,0)}–{_fmt(ro['roof_strip']['util_ltb_6322']*100,0)} %")
    print(f"B2 ugunstige anslag samtidig: MEd {_fmt(ro['unfav']['MEd'],1)} ({_fmt(ro['unfav']['util']*100,0)} %), RB {_fmt(ro['unfav']['RB'],1)}, gavl {_fmt(ro['unfav']['gable_P'],1)} kN")
    for nm in ("B1", "B2"):
        t = r[nm]["restraint"]
        print(f"{nm} fastholding: Nf {_fmt(t['Nf'],0)} kN, 2,5 % = {_fmt(t['F_25pct'],1)} kN, last på flens {_fmt(t['load'],1)} kN, mu_req {_fmt(t['mu_req'],3)}, "
              f"friksjon(0,2) {_fmt(t['friction_02'],1)} kN; ett punkt: segment {_fmt(t['seg']['Lseg'])} m, Mb,Rd {_fmt(t['seg']['MbRd'],1)} -> {_fmt(t['util_seg']*100,0)} %")
