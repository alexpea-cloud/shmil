/* Bottom progress line, identical to the one in film.js, for demo pages rendered inside the film (?film=1). */
(function () {
  const STEPS = ['Avviket', 'Spørsmål og svar', 'Grunnlaget', 'Konsekvensen', 'Søknaden'];
  const css = document.createElement('style');
  css.textContent = `.prog{position:absolute;left:0;top:1006px;width:1920px;display:flex;justify-content:center;align-items:center;gap:20px;
  font:500 21px/1 FS,Inter,sans-serif;letter-spacing:.05em;color:#A3ACB0;white-space:nowrap;z-index:5}
.prog .sep{width:44px;height:2px;border-radius:1px;background:#CDD2CD}
.prog .it.done{color:#76838A}
.prog .it.cur{color:#1B2326;font-weight:600}
.prog .it.cur::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:#0E9C79;margin-right:10px;position:relative;top:-1px}`;
  document.head.appendChild(css);
  window.filmProgress = function (current) {
    if (!/film=1/.test(location.search)) return;
    const el = document.createElement('div');
    el.className = 'prog';
    STEPS.forEach((s, i) => {
      if (i) { const sp = document.createElement('span'); sp.className = 'sep'; el.appendChild(sp); }
      const it = document.createElement('span');
      it.className = 'it' + (i === current ? ' cur' : i < current ? ' done' : '');
      it.textContent = s;
      el.appendChild(it);
    });
    const black = document.getElementById('black');
    black.parentNode.insertBefore(el, black);
  };
})();
