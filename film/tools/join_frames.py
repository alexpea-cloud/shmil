"""Joins the rendered segments (output/frames-s*_*) into one frame sequence with 1 s cross-dissolves.
Usage: python3 tools/join_frames.py <output_dir> <duration_s>"""
import os, sys, shutil
from PIL import Image
OUT, DUR, FPS = sys.argv[1], float(sys.argv[2]), 30
# (frames dir, film time of the segment's first frame)
SEGS = [('s1_kart', 0.0), ('s2_film', 19.3), ('s3_3d', 109.3), ('s4_film', 134.2), ('s5_b', 144.2), ('s6_film', 194.2)]
segs = []
for name, t0 in SEGS:
    d = os.path.join(OUT, 'frames-' + name)
    n = len([f for f in os.listdir(d) if f.endswith('.jpg')])
    segs.append((d, round(t0 * FPS), n))
dst = os.path.join(OUT, 'frames-final'); shutil.rmtree(dst, ignore_errors=True); os.makedirs(dst)
N = round(DUR * FPS)
smooth = lambda x: x * x * (3 - 2 * x)
for i in range(N):
    cov = [(d, i - s0, n, s0) for d, s0, n in segs if 0 <= i - s0 < n]
    out = os.path.join(dst, f'f{i:05d}.jpg')
    if len(cov) == 1:
        os.link(os.path.join(cov[0][0], f'f{cov[0][1]:05d}.jpg'), out)
    else:
        (da, ia, na, sa), (db, ib, nb, sb) = sorted(cov, key=lambda c: c[3])[:2]
        ov0, ov1 = sb, sa + na            # overlap window in frames
        w = smooth((i - ov0 + 0.5) / max(1, ov1 - ov0))
        A = Image.open(os.path.join(da, f'f{ia:05d}.jpg')); B = Image.open(os.path.join(db, f'f{ib:05d}.jpg'))
        Image.blend(A, B, w).save(out, quality=95)
print('joined', N, 'frames into', dst)
