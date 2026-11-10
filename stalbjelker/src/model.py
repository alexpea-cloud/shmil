"""model.py – felles geometri og faste opplysninger for tegningene.

Koordinater i meter. PLAN: x fra vestre ytterveggs utside mot øst, y fra nordre ytterveggs utside
mot sør (samme orientering som E2 – «opp» på arket er nord-enden av huset slik E2 er tegnet;
himmelretning er ikke kjent og vises ikke). Veggeometrien er hentet fra tiltakshavers rev. 10
(som igjen er tegnet etter E2) og er ikke kontrollmålt.
"""

# ---------------------------------------------------------------- prosjekt
# Eiendom, tiltakshaver og saksnummer ligger i privat/prosjekt.json, som ikke versjonskontrolleres.
import json as _json
import os as _os

_PRIV = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "privat", "prosjekt.json")
_P = _json.load(open(_PRIV, encoding="utf-8")) if _os.path.exists(_PRIV) else {}
PROJECT = dict(
    address=_P.get("eiendom", "[eiendom]"),
    gnr_bnr=_P.get("gnr_bnr", "[gnr./bnr.]"),
    municipality=_P.get("kommune", "[kommune]"),
    owner=_P.get("tiltakshaver", "[tiltakshaver]"),
    case=_P.get("sak", "[saksnummer]"),
    date=_P.get("dato", "10.11.2026"),
    rev=_P.get("rev", "11"),
)
PROJECT["line"] = f'{PROJECT["address"]} · {PROJECT["gnr_bnr"]} · {PROJECT["municipality"]}'
REV_ROWS = [
    ("11", "10.11.2026",
     "Ny utgave i A3. «ca.» på mål som ikke er kontrollmålt. Taksperrenes opplegg og oppleggsdetaljer er vist."),
    ("10", "nov. 2026", "Tiltakshavers utkast (A4). Erstattes av rev. 11."),
]

# ---------------------------------------------------------------- vegger 1. etasje (plan)
# (x1, y1, x2, y2) – rektangler, snittet vegg
T_OUT = 0.197
WALLS = [
    # vestre yttervegg (med dør og vinduer som åpninger)
    (0.000, 3.30, 0.197, 4.908),
    (0.000, 5.691, 0.197, 5.814),
    (0.000, 6.777, 0.197, 9.412),
    (0.000, 10.373, 0.197, 12.845),
    (0.000, 13.830, 0.197, 14.20),
    # østre yttervegg
    (7.396, 3.30, 7.593, 5.561),
    (7.396, 6.135, 7.593, 7.419),
    (7.396, 7.976, 7.593, 11.088),
    (7.396, 12.480, 7.593, 14.20),
    # vegg stue/kjøkken
    (0.197, 4.643, 0.873, 4.857),
    (2.145, 4.643, 4.469, 4.857),
    (5.285, 4.643, 7.396, 4.857),
    # vegg kjøkken / vaskerom–bod («bodveggen» i 1. etasje)
    (5.319, 4.857, 5.432, 5.420),
    (5.319, 6.192, 5.432, 7.360),
    (5.319, 8.151, 5.432, 8.680),
    # vegg vaskerom/bod
    (5.432, 6.890, 7.396, 7.002),
    # tømmervegg (opprinnelig yttervegg) – med døråpning x = 3,951–4,925
    (0.197, 8.680, 3.951, 8.894),
    (4.925, 8.680, 7.396, 8.894),
    # vegg bad / gang–entré («badveggen»)
    (3.343, 8.894, 3.457, 9.996),
    (3.343, 10.767, 3.457, 11.567),
    (3.343, 12.440, 3.457, 14.20),
    # vegg bad / soverom
    (0.197, 11.381, 3.343, 11.494),
    # vegg sør for trapp / mot inngangsparti
    (6.197, 10.874, 7.396, 11.088),
    # entréens yttervegg mot øst (med ytterdør)
    (6.501, 11.088, 6.715, 11.166),
    (6.501, 12.045, 6.715, 12.529),
    (6.715, 12.480, 7.396, 12.693),
    # vegg entré / soverom i sør
    (3.457, 12.529, 4.050, 12.642),
    (4.824, 12.529, 6.603, 12.642),
    # veggstump i entré
    (5.028, 12.040, 5.236, 12.529),
]
# hvilke vegger er tømmervegg (opprinnelig yttervegg)
LOG_WALL_Y = (8.680, 8.894)
LOG_DOOR_X = (3.951, 4.925)        # døråpningen i tømmerveggen der oppleggene står

WINDOWS = [   # (x1, y1, x2, y2) i yttervegg
    (0.000, 5.814, 0.197, 6.777),     # kjøkken
    (0.000, 9.412, 0.197, 10.373),    # bad
    (0.000, 12.845, 0.197, 13.830),   # soverom
    (7.396, 5.561, 7.593, 6.135),     # vaskerom
    (7.396, 7.419, 7.593, 7.976),     # bod
]
DOORS_EXT = [  # ytterdører (åpning i vegg)
    (0.000, 4.908, 0.197, 5.691),     # kjøkken, vest
    (6.501, 11.166, 6.715, 12.045),   # entré, øst
]

ROOMS = [  # (navn, x, y)
    ("Kjøkken", 1.75, 6.95),
    ("Vaskerom", 6.45, 5.95),
    ("Bod", 6.45, 7.90),
    ("Bad", 1.65, 10.10),
    ("Soverom", 1.75, 12.95),
    ("Entré", 4.12, 11.74),
    ("Stue", 3.8, 3.95),
    ("Soverom", 5.6, 13.45),
]

# trapp (opp til 2. etasje) – to løp og repos
STAIR = dict(outer=(5.099, 8.899, 7.396, 10.886),
             flight1=(5.099, 8.899, 6.649, 9.810),
             flight2=(5.099, 9.964, 6.649, 10.886),
             steps_x=[5.293, 5.487, 5.680, 5.874, 6.068, 6.261, 6.455])

# ---------------------------------------------------------------- konstruksjon
CHIMNEY = (3.929, 4.678, 4.334, 5.083)        # teglsteinspipe (tatt ut av bruk 2018)

B1 = dict(x=3.929, y1=5.083, y2=8.811, b=0.091, L=3.63,
          sup1=(5.083, 5.181),                # opplegg ved pipa (98 mm)
          sup2=(8.713, 8.861))                # opplegg mot grunnmur (98 + 50 mm)
B2 = dict(x=4.979, y1=8.763, y2=12.260, b=0.091, L=3.40,
          sup1=(8.713, 8.861),                # opplegg mot grunnmur
          sup2=(12.162, 12.260))              # opplegg ved betongsøylen (98 mm)
B1_C = (5.132, 8.762)                         # oppleggssentre B1 (y)
B2_C = (8.812, 12.212)                        # oppleggssentre B2 (y)

IPN200 = (3.854, 4.787, 4.004, 8.667)         # under gulvet, rett under B1
CONC_BLOCK = (3.725, 4.828, 4.134, 5.737)     # betongkloss under gulvet (0,90 m lang)
FOUNDATION = (0.175, 8.657, 7.423, 8.916)     # grunnmur under tømmerveggen (ca. 0,25 m)
COLUMN = (4.979, 12.212, 0.100)               # betongsøyle Ø ca. 200 under gulvet (x, y, r)

OLD_POST = (4.979, 11.062)                    # opprinnelig hjørnestolpe, fjernet 2018 (x = 2,25 langs B2)
GABLE_Y = 11.062                              # gavlvegg 2. etasje (senterlinje), over B2 ved x = 2,25
BODVEGG2_X = 4.444                            # bodvegg i 2. etasje, ca. 0,5 m fra B1
BODVEGG2_Y = (4.857, 8.680)
FORMER_WALL2_X = 4.979 - 1.70                 # tidligere yttervegg i 2. etasje = opplegg for taksperrer, 1,70 m fra B2
FORMER_WALL2_Y = (8.787, 11.062)
BATH_WALL_X = 3.457                           # badveggens side mot gangen (ca. 1,50 m fra B2)
ENTRE_EAST_WALL_X = 6.501                     # entréens yttervegg (ca. 1,65 m fra B2 der takbjelkene ligger opp)

# bjelkelag over gangen (fra badveggen til trappevekslingen på B2) – prinsipp
HALL_JOISTS_Y = [9.40, 10.00, 10.60]
# takbjelker under takterrassen – de to som ligger på B2
TERRACE_JOISTS_Y = [8.812 + 2.55, 8.812 + 3.15]
TERRACE_JOIST_X = (3.457, 6.501)

# avstander langs B2 fra oppleggssenter ved grunnmuren
X_FLOOR = (0.10, 2.10)
X_STAIR = 1.20
X_GABLE = 2.25
X_JOISTS = (2.55, 3.15)

# utsnitt som vises i planen (y-område)
PLAN_Y = (3.30, 14.20)
