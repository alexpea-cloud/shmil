"""calcfig.py – felles figurer for beregningsbåndet på ark 2 og 3: statisk system med last,
momentdiagram, lasttabell og kontrolltabell med utnyttelsesstolper."""
from drawlib import *     # noqa: F403


def static_system(s: Sheet, x, y, w, L, *, udls=(), points=(), reactions=("", ""), title="Statisk system og last",
                  dims=(), h_load=9.0):
    """Fritt opplagt bjelke med laster. x, y = øvre venstre hjørne av figurfeltet, w = bredde for spennet L (m).
    udls: [(x1, x2, etikett, farge)], points: [(x, etikett, farge, nivå)], reactions: (tekst A, tekst B),
    dims: [(x1, x2, tekst)]. Returnerer y under figuren."""
    k = w / L
    s.text(x, y + 2.4, title, size=T_S, weight=700)
    yb = y + 8.0 + h_load + 6.0            # bjelkelinje
    X = lambda xm: x + xm * k              # noqa: E731
    # laster
    for (x1, x2, label, color) in udls:
        s.udl(X(x1), X(x2), yb - h_load * 0.55, yb - 0.8, color=color, label=label, size=T_XS, n=max(3, int((x2 - x1) * k / 5) + 1))
    for (xp, label, color, level) in points:
        top = yb - h_load - 3.2 * level
        s.pload(X(xp), top, yb - 0.8, label, color=color, size=T_XS, lw=0.35)
    # bjelke og opplegg
    s.line(X(0), yb, X(L), yb, (INK, 0.7, None))
    for xs in (0, L):
        s.poly([(X(xs), yb), (X(xs) - 2.0, yb + 3.2), (X(xs) + 2.0, yb + 3.2)], (INK, 0.25, None), fill=PAPER, close=True)
        s.line(X(xs) - 2.8, yb + 3.2, X(xs) + 2.8, yb + 3.2, (INK, 0.25, None))
    # reaksjoner
    s.text(X(0), yb + 7.4, reactions[0], size=T_XS, weight=600, anchor="middle")
    s.text(X(L), yb + 7.4, reactions[1], size=T_XS, weight=600, anchor="middle")
    yd = yb + 11.0
    for (x1, x2, label) in dims:
        s.dim((X(x1), yd), (X(x2), yd), 0, label, ext=False, size=T_XS, text_off=0.7)
    return yd + 2.0


def moment_diagram(s: Sheet, x, y, w, L, curve, *, h=11.0, label="", x_max=None, m_max=None,
                   title="Moment M_{Ed}"):
    """Momentdiagram tegnet nedover (strekkside). curve: [(x, M)]. Returnerer y under figuren."""
    k = w / L
    mm = max(m for _, m in curve) or 1.0
    s.text(x, y + 2.2, title, size=T_XS, weight=600, fill=INK2)
    y0 = y + 4.2
    pts = [(x, y0)] + [(x + xm * k, y0 + m / mm * h) for xm, m in curve] + [(x + w, y0)]
    s.poly(pts, (STEEL, 0.3, None), fill=STEEL_F, close=True, opacity=0.8)
    s.line(x, y0, x + w, y0, (INK, 0.3, None))
    if x_max is not None:
        xp = x + x_max * k
        s.line(xp, y0, xp, y0 + h, (STEEL, 0.15, "0.8 0.6"))
        s.text(xp, y0 + h + 3.0, label, size=T_XS, weight=700, fill=STEEL, anchor="middle")
    return y0 + h + 4.6


def check_table(s: Sheet, x, y, w, rows, *, title="Kontroll", note=None):
    """Kontrolltabell: rows = [(navn, Ed, Rd, utnyttelse 0–1 eller None, statusfarge, kommentar)].
    Returnerer y under tabellen."""
    s.text(x, y + 2.4, title, size=T_S, weight=700)
    yy = y + 4.6
    c_name, c_ed, c_rd, c_bar, c_pct = 0.36 * w, 0.14 * w, 0.14 * w, 0.20 * w, 0.16 * w
    # hode
    hx = x + c_name
    s.text(hx + c_ed - 1.0, yy + 2.6, "E_{d}", size=T_XS * 0.9, fill=INK3, anchor="end", weight=600)
    s.text(hx + c_ed + c_rd - 1.0, yy + 2.6, "R_{d}", size=T_XS * 0.9, fill=INK3, anchor="end", weight=600)
    s.text(x + w, yy + 2.6, "utnyttelse", size=T_XS * 0.9, fill=INK3, anchor="end", weight=600)
    yy += 3.6
    s.line(x, yy, x + w, yy, (INK2, 0.2, None))
    rh = 4.1
    for (name, ed, rd, util, color, comment) in rows:
        s.text(x + 0.6, yy + rh * 0.70, name, size=T_XS, weight=500)
        s.text(hx + c_ed - 1.0, yy + rh * 0.70, ed, size=T_XS, weight=700, anchor="end")
        s.text(hx + c_ed + c_rd - 1.0, yy + rh * 0.70, rd, size=T_XS, anchor="end", fill=INK2)
        if util is not None:
            s.utilbar(hx + c_ed + c_rd + 1.5, yy + rh * 0.36, c_bar - 3.0, util, color=color or STEEL_D)
            s.text(x + w, yy + rh * 0.70, f"{num(util * 100, 0)} %", size=T_XS, weight=700, anchor="end",
                   fill=color or INK)
        elif comment:
            s.text(x + w, yy + rh * 0.70, comment, size=T_XS, weight=600, anchor="end", fill=color or INK2)
        yy += rh
        s.line(x, yy, x + w, yy, "rule")
    if note:
        yy = s.mtext(x, yy + 3.2, wrap(note, T_XS, w), size=T_XS, fill=INK2) - 1.0
    return yy


def load_table(s: Sheet, x, y, w, rows, *, title="Laster", head=("", "g_{k}", "q_{k}", "dim."), note=None,
               colfrac=(0.55, 0.15, 0.15, 0.15), bold_last=True):
    """Lasttabell. rows = [(tekst, gk, qk, dim)] som strenger. Returnerer y under tabellen."""
    s.text(x, y + 2.4, title, size=T_S, weight=700)
    colw = [w * f for f in colfrac]
    yy = s.table(x, y + 4.2, colw, [list(head)] + [list(r) for r in rows], size=T_XS, row_h=4.3,
                 align=["l"] + ["r"] * (len(colw) - 1), bold_last=bold_last)
    if note:
        yy = s.mtext(x, yy + 3.2, wrap(note, T_XS, w), size=T_XS, fill=INK2) - 1.0
    return yy
