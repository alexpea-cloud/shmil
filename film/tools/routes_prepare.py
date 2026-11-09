"""Builds illustrative collection routes for the map sequence (demos/routes.js).

Land mask = municipality polygons from demos/geo.js (Kartverket, CC BY 4.0).
Each truck tour is a chain of A* legs on a 0.4 km grid: land is cheap, sea is
expensive, so the path only crosses water where it has to (shown as ferry).
Usage: python3 tools/routes_prepare.py demos/geo.js demos/routes.js
"""
import json, math, sys, heapq
from PIL import Image, ImageDraw

RES = 0.4
X0, X1, Y0, Y1 = -190.0, 0.0, -7370.0, -7200.0
W, H = int((X1 - X0) / RES), int((Y1 - Y0) / RES)

def tm(lon, lat, lon0=15.0, k0=0.9996):
    a, f = 6378137.0, 1 / 298.257222101
    e2 = f * (2 - f); ep2 = e2 / (1 - e2)
    phi, lam = math.radians(lat), math.radians(lon - lon0)
    N = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    T = math.tan(phi) ** 2; C = ep2 * math.cos(phi) ** 2; A = math.cos(phi) * lam
    M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120)
    y = k0 * (M + N * math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720))
    return x / 1000.0, -y / 1000.0

src = open(sys.argv[1], encoding='utf-8').read()
G = json.loads(src[src.index('=') + 1:].strip().rstrip(';'))
img = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(img)
toG = lambda x, y: ((x - X0) / RES, (y - Y0) / RES)
for grp in (G['ctx'], G['own']):
    for o in grp:
        for ring in o['paths']:
            if len(ring) >= 3:
                d.polygon([toG(x, y) for x, y in ring], fill=255)
land = img.load()
isLand = lambda i, j: 0 <= i < W and 0 <= j < H and land[i, j] > 0

def snap(x, y):
    i, j = map(int, toG(x, y))
    best = None
    for r in range(0, 40):
        for di in range(-r, r + 1):
            for dj in range(-r, r + 1):
                if max(abs(di), abs(dj)) == r and isLand(i + di, j + dj):
                    dd = di * di + dj * dj
                    if best is None or dd < best[0]: best = (dd, i + di, j + dj)
        if best: return best[1], best[2]
    return i, j

def centroid(nr):
    o = next(o for o in G['own'] if o['nr'] == nr)
    ring = max(o['paths'], key=lambda r: abs(sum(r[k][0] * r[k - 1][1] - r[k - 1][0] * r[k][1] for k in range(len(r)))))
    return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)

SEA = 8.0
def astar(a, b):
    (ai, aj), (bi, bj) = a, b
    h = lambda i, j: math.hypot(i - bi, j - bj)
    openh = [(h(ai, aj), 0.0, ai, aj)]
    g = {(ai, aj): 0.0}; prev = {}
    nb = [(1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)]
    while openh:
        f, gc, i, j = heapq.heappop(openh)
        if (i, j) == (bi, bj): break
        if gc > g.get((i, j), 1e18): continue
        for di, dj, c in nb:
            ni, nj = i + di, j + dj
            if not (0 <= ni < W and 0 <= nj < H): continue
            cost = c * (1.0 if land[ni, nj] else SEA)
            ng = gc + cost
            if ng < g.get((ni, nj), 1e18):
                g[(ni, nj)] = ng; prev[(ni, nj)] = (i, j)
                heapq.heappush(openh, (ng + h(ni, nj), ng, ni, nj))
    path = [(bi, bj)]
    while path[-1] != (ai, aj): path.append(prev[path[-1]])
    return path[::-1]

def simplify(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        i, j = st.pop(); ax, ay = pts[i][:2]; bx, by = pts[j][:2]; L = math.hypot(bx - ax, by - ay)
        best, bk = -1, -1
        for k in range(i + 1, j):
            px, py = pts[k][:2]; dd = abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / L if L > 1e-6 else math.hypot(px - ax, py - ay)
            if dd > best: best, bk = dd, k
        if best > tol: keep[bk] = True; st += [(i, bk), (bk, j)]
    return [p for p, k in zip(pts, keep) if k]

def chaikin(pts, n=2):
    for _ in range(n):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            if a[2] != b[2]:          # keep land/sea switch points sharp (ferry quays)
                out += [a, b]; continue
            out += [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1], a[2]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1], a[2]]]
        out.append(pts[-1]); pts = out
    return pts

# places: towns (fixed), villages (approximate, snapped to land), islands (polygon centroids)
P = {
    'Brønnøysund': tm(12.2117, 65.4747), 'Sandnessjøen': tm(12.6316, 66.0217), 'Mosjøen': tm(13.1913, 65.8370),
    'Sømna': tm(12.17, 65.315), 'Vevelstad': tm(12.44, 65.69), 'Hommelstø': tm(12.53, 65.44),
    'Vega': centroid('1815'), 'Herøy': centroid('1818'), 'Dønna': centroid('1827'),
    'Tjøtta': tm(12.43, 65.83), 'Leirfjord': tm(12.93, 66.065),
    'Grane': tm(13.40, 65.535), 'Hattfjelldal': tm(13.99, 65.597), 'Elsfjord': tm(13.55, 66.08),
}
# per-municipality masks (to keep island and mainland sides apart)
MUN = {}
for o in G['own']:
    m = Image.new('L', (W, H), 0); dm = ImageDraw.Draw(m)
    for ring in o['paths']:
        if len(ring) >= 3: dm.polygon([toG(x, y) for x, y in ring], fill=255)
    MUN[o['nr']] = m.load()
ISLAND = {'Vega': '1815', 'Herøy': '1818', 'Dønna': '1827'}

def component(start, allowed):
    seen = {start}; q = [start]
    while q:
        i, j = q.pop()
        for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if (ni, nj) not in seen and 0 <= ni < W and 0 <= nj < H and allowed(ni, nj):
                seen.add((ni, nj)); q.append((ni, nj))
    return seen

def astar_in(a, b, allowed):
    (ai, aj), (bi, bj) = a, b
    h = lambda i, j: math.hypot(i - bi, j - bj)
    openh = [(h(ai, aj), 0.0, ai, aj)]; g = {(ai, aj): 0.0}; prev = {}
    nb = [(1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)]
    while openh:
        f, gc, i, j = heapq.heappop(openh)
        if (i, j) == (bi, bj): break
        if gc > g.get((i, j), 1e18): continue
        for di, dj, c in nb:
            ni, nj = i + di, j + dj
            if not (0 <= ni < W and 0 <= nj < H): continue
            cost = c * (1.0 if allowed(ni, nj) else SEA)
            ng = gc + cost
            if ng < g.get((ni, nj), 1e18):
                g[(ni, nj)] = ng; prev[(ni, nj)] = (i, j); heapq.heappush(openh, (ng + h(ni, nj), ng, ni, nj))
    path = [(bi, bj)]
    while path[-1] != (ai, aj): path.append(prev[path[-1]])
    return path[::-1]

def cellpt(c, sea=0):
    return [X0 + (c[0] + .5) * RES, Y0 + (c[1] + .5) * RES, sea]

def leg(a, b):
    """land leg, or hub -> island via a ferry crossing"""
    isl = ISLAND.get(b) or ISLAND.get(a)
    if not isl:
        path = astar_in(cells[a], cells[b], lambda i, j: land[i, j] > 0)
        out = []
        for c in path:
            out.append(cellpt(c, 0 if land[c] else 1))
        # short sea bits are bridges / narrow sounds: treat as land
        k = 0
        while k < len(out):
            if out[k][2]:
                e = k
                while e < len(out) and out[e][2]: e += 1
                if (e - k) * RES < 1.6:
                    for q in range(k, e): out[q][2] = 0
                k = e
            else: k += 1
        return out
    toIsland = b in ISLAND
    hub, isle = (a, b) if toIsland else (b, a)
    im = MUN[ISLAND[isle]]
    iscomp = component(cells[isle], lambda i, j: im[i, j] > 0)
    # mainland quay: approximate ferry landing (illustrative), snapped to land outside the island municipality
    qx, qy = QUAY[isle]
    qi0, qj0 = map(int, toG(qx, qy))
    mainok = lambda i, j: 0 <= i < W and 0 <= j < H and land[i, j] > 0 and im[i, j] == 0
    qM = min(((i, j) for i in range(qi0 - 30, qi0 + 31) for j in range(qj0 - 30, qj0 + 31) if mainok(i, j)),
             key=lambda c: (c[0] - qi0) ** 2 + (c[1] - qj0) ** 2)
    qI = min(iscomp, key=lambda c: (c[0] - qM[0]) ** 2 + (c[1] - qM[1]) ** 2)
    landM = astar_in(cells[hub], qM, lambda i, j: land[i, j] > 0 and im[i, j] == 0)
    landI = astar_in(qI, cells[isle], lambda i, j: im[i, j] > 0)
    seg = [cellpt(c) for c in landM] + [cellpt(qM, 1), cellpt(qI, 1)] + [cellpt(c) for c in landI]
    return seg if toIsland else seg[::-1]

# approximate mainland ferry landings for the island legs (illustration only)
QUAY = {'Vega': tm(12.27, 65.55), 'Herøy': tm(12.42, 65.93), 'Dønna': tm(12.62, 66.03)}

TOURS = [
    ['Brønnøysund', 'Sømna', 'Brønnøysund', 'Vega', 'Brønnøysund', 'Hommelstø', 'Vevelstad', 'Brønnøysund'],
    ['Sandnessjøen', 'Dønna', 'Sandnessjøen', 'Herøy', 'Sandnessjøen', 'Leirfjord', 'Sandnessjøen', 'Tjøtta', 'Sandnessjøen'],
    ['Mosjøen', 'Grane', 'Hattfjelldal', 'Grane', 'Mosjøen', 'Elsfjord', 'Mosjøen'],
]
cells = {k: snap(*v) for k, v in P.items()}
out = []
for tour in TOURS:
    sm = []
    for a, b in zip(tour, tour[1:]):
        pts = leg(a, b)
        runs, cur = [], [pts[0]]
        for p in pts[1:]:
            if p[2] == cur[-1][2]: cur.append(p)
            else: runs.append(cur); cur = [cur[-1][:2] + [p[2]], p]
        runs.append(cur)
        # flag of a point = type of the segment that leaves it (0 road, 1 ferry)
        merged = []
        for r in runs:
            T = r[-1][2]
            q = chaikin(simplify(r, 0.45), 2) if T == 0 else [r[0], r[-1]]
            q = [[x, y, T] for x, y, _ in q]
            if merged: merged[-1][2] = T; q = q[1:]
            merged += q
        if sm: sm[-1][2] = merged[0][2]; merged = merged[1:]
        sm += merged
    out.append({'stops': [k for k in dict.fromkeys(tour)], 'pts': [[round(x, 2), round(y, 2), s] for x, y, s in sm]})
    sea = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(sm, sm[1:]) if a[2])
    tot = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(sm, sm[1:]))
    print(tour[0], 'points', len(sm), 'length km', round(tot), 'sea km', round(sea))
places = {k: [round(P[k][0], 2), round(P[k][1], 2)] for k in P}
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    f.write('// Generated by tools/routes_prepare.py – illustrative routes on Kartverket municipality polygons.\n')
    f.write('window.ROUTES = ' + json.dumps({'tours': out, 'places': places}, ensure_ascii=False, separators=(',', ':')) + ';\n')
# debug picture
dbg = img.convert('RGB').resize((W * 2, H * 2))
dd = ImageDraw.Draw(dbg)
cols = [(42, 127, 166), (0, 123, 97), (200, 80, 40)]
for k, r in enumerate(out):
    for a, b in zip(r['pts'], r['pts'][1:]):
        A = toG(a[0], a[1]); B = toG(b[0], b[1])
        dd.line([(A[0] * 2, A[1] * 2), (B[0] * 2, B[1] * 2)], fill=(255, 0, 0) if a[2] else cols[k], width=3)
for k, v in P.items():
    gx, gy = toG(*v); dd.ellipse([gx * 2 - 5, gy * 2 - 5, gx * 2 + 5, gy * 2 + 5], fill=(255, 200, 0)); dd.text((gx * 2 + 7, gy * 2 - 7), k, fill=(255, 255, 0))
dbg.save(sys.argv[3] if len(sys.argv) > 3 else '/dev/null', 'PNG') if len(sys.argv) > 3 else None
