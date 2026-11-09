"""Traces the white glyphs of the national sorting pictograms from reference screenshots
into SVG paths in a 100 x 100 square (marching squares + Douglas-Peucker).
Usage: python3 tools/trace_icons.py <ref_dir> <out_dir>
"""
import sys, math
from PIL import Image

def mask(im, box, thr=200):
    x0, y0, x1, y1 = box
    c = im.crop(box).convert('L')
    W, H = c.size; px = c.load()
    return [[1 if px[i, j] >= thr else 0 for i in range(W)] for j in range(H)], W, H

def loops(m, W, H):
    g = lambda i, j: m[j][i] if 0 <= i < W and 0 <= j < H else 0
    segs = {}
    for j in range(-1, H):
        for i in range(-1, W):
            a, b, c, d = g(i, j), g(i + 1, j), g(i + 1, j + 1), g(i, j + 1)
            code = a * 8 + b * 4 + c * 2 + d
            T, R, B, L = (i + .5, j), (i + 1, j + .5), (i + .5, j + 1), (i, j + .5)
            T, R, B, L = ((i + 1, j + .5 + .5) if False else (i + 1, j + .5 + 0)), None, None, None
            # cell corners at pixel centres: tl=(i,j) tr=(i+1,j) br=(i+1,j+1) bl=(i,j+1)
            t, r, bm, l = (i + .5, j), (i + 1, j + .5), (i + .5, j + 1), (i, j + .5)
            table = {1: [(l, bm)], 2: [(bm, r)], 3: [(l, r)], 4: [(r, t)], 5: [(l, t), (r, bm)], 6: [(bm, t)], 7: [(l, t)],
                     8: [(t, l)], 9: [(t, bm)], 10: [(t, r), (bm, l)], 11: [(t, r)], 12: [(r, l)], 13: [(r, bm)], 14: [(bm, l)]}
            for s, e in table.get(code, []):
                segs[s] = e
    out = []
    while segs:
        s, e = segs.popitem(); loop = [s, e]
        while e in segs:
            e = segs.pop(e); loop.append(e)
        if len(loop) > 8: out.append(loop)
    return out

def dp(pts, tol):
    if len(pts) < 4: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        i, j = st.pop(); ax, ay = pts[i]; bx, by = pts[j]; L = math.hypot(bx - ax, by - ay)
        best, bk = -1, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            d = abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / L if L > 1e-9 else math.hypot(px - ax, py - ay)
            if d > best: best, bk = d, k
        if best > tol: keep[bk] = True; st += [(i, bk), (bk, j)]
    return [p for p, k in zip(pts, keep) if k]

def trace(im, glyph_box, square, tol=1.0):
    m, W, H = mask(im, glyph_box)
    sx0, sy0, side = square
    paths = []
    for lp in loops(m, W, H):
        # split closed loop at farthest point so DP works on two open halves
        far = max(range(len(lp)), key=lambda k: (lp[k][0] - lp[0][0]) ** 2 + (lp[k][1] - lp[0][1]) ** 2)
        a = dp(lp[:far + 1], tol); b = dp(lp[far:], tol)
        pts = a[:-1] + b[:-1]
        u = [((glyph_box[0] + x - sx0) / side * 100, (glyph_box[1] + y - sy0) / side * 100) for x, y in pts]
        paths.append('M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in u) + ' Z')
    return ' '.join(paths)

ref, out = sys.argv[1], sys.argv[2]
k = 1440 / 923
g = Image.open(ref + '/glass.jpg').convert('RGB')
p = Image.open(ref + '/papp.jpg').convert('RGB')
B = lambda b: tuple(int(round(v * k)) for v in b)
# squares in the full screenshots (x0, y0, side) in source pixels
gsq = (int(14 * k) + 5, int(222 * k) + 2, 683)
msq = (int(14 * k) + 712, int(222 * k) + 2, 684)
psq = (0, int(368 * k), 478)
csq = (int(368 * k) * 0 + 480, int(368 * k), 480)
gx, gy = int(14 * k), int(222 * k)
bottle = trace(g, (gx + 250, gy + 105, gx + 442, gy + 585), gsq, 0.9)
can = trace(g, (gx + 935, gy + 105, gx + 1175, gy + 560), msq, 0.9)
py0 = int(368 * k)
carton = trace(p, (640, py0 + 70, 800, py0 + 398), (480, py0, 480), 0.9)
# box: high-resolution Grønt Punkt tile; fit its glyph bbox to the bbox measured on the sorting-label strip
bx = Image.open(ref + '/papp.jpg').convert('RGB')
bb = B((467, 1262, 913, 1720))
boxpath_raw = trace(bx, (bb[0] + 85, bb[1] + 150, bb[0] + 625, bb[1] + 560), (0, 0, 1), 0.9)
open(out + '/_trace.txt', 'w').write('\n'.join([bottle, can, carton, boxpath_raw]))
print('bottle', len(bottle), 'can', len(can), 'carton', len(carton), 'box', len(boxpath_raw))
