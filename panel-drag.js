// Przeciąganie wizyt w kalendarzu panelu: mysz i rysik od razu, dotyk po przytrzymaniu (350 ms), klawiatura Alt + strzałki.
// Strona podaje geometrię i regułę kolizji (cfg), ten plik robi gesty, wskaźnik upuszczenia i pasek „Cofnij”. Używają go panel.html i panel-tydzien.html.
(function () {
  const CSS = `
.kal-ghost{position:fixed;z-index:999;pointer-events:none;opacity:.92;box-shadow:0 8px 24px rgba(30,26,29,.25);margin:0 !important;transition:none !important}
.kal-src{opacity:.35}
.kal-ind{position:absolute;left:4px;right:4px;box-sizing:border-box;border:2px dashed #1F6B47;background:rgba(230,242,236,.7);border-radius:10px;pointer-events:none;z-index:5;padding:4px 8px;font:700 12px 'DM Sans',sans-serif;color:#1F6B47}
.kal-ind.bad{border-color:#A3262A;background:rgba(255,241,224,.85);color:#A3262A}
body.kal-dragging{user-select:none;-webkit-user-select:none;cursor:grabbing}
.kal-item{touch-action:manipulation;-webkit-touch-callout:none}
.kal-bar{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:1001;max-width:calc(100% - 24px);box-sizing:border-box;display:flex;gap:12px;align-items:center;padding:8px 8px 8px 16px;border-radius:12px;background:#1E1A1D;color:#fff;font:14px/1.4 'DM Sans',system-ui,sans-serif}
.kal-bar.warn{background:#8A3B12}
.kal-bar button{min-height:44px;padding:0 14px;border-radius:8px;border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;font:inherit;font-weight:700;cursor:pointer;flex:none}
.kal-bar[hidden]{display:none}`;
  const fmt = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

  let bar, barTimer;
  function showBar(text, kind, undo) {
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'kal-bar'; bar.hidden = true;
      bar.innerHTML = '<span></span><button type="button">Cofnij</button>';
      document.body.appendChild(bar);
    }
    bar.className = 'kal-bar' + (kind === 'warn' ? ' warn' : '');
    bar.setAttribute('role', kind === 'warn' ? 'alert' : 'status');
    bar.firstChild.textContent = text;
    const b = bar.querySelector('button');
    b.hidden = !undo; b.onclick = () => { bar.hidden = true; undo(); };
    bar.hidden = false;
    clearTimeout(barTimer); barTimer = setTimeout(() => { bar.hidden = true; }, undo ? 9000 : 7000);
  }

  // cfg: { root, attr ('id'|'k'), cols() -> [el], ppm (px/min), top0 (px dla startMin), startMin, endMin, snap,
  //        place(id) -> {col, start, dur}, check(id, col, start, dur) -> '' | powód kolizji, commit(id, col, start), label(id), colName(col) }
  function attach(cfg) {
    const sel = `[data-${cfg.attr}]`, idOf = el => el.dataset[cfg.attr];
    const styleEl = document.getElementById('kal-css') || Object.assign(document.createElement('style'), { id: 'kal-css', textContent: CSS });
    if (!styleEl.parentNode) document.head.appendChild(styleEl);
    let d = null, dragged = false;
    const clampStart = (m, dur) => Math.max(cfg.startMin, Math.min(Math.round(m / cfg.snap) * cfg.snap, cfg.endMin - dur));
    const ind = document.createElement('div'); ind.className = 'kal-ind';

    function tryMove(id, col, start) {
      const cur = cfg.place(id), reason = cfg.check(id, col, start, cur.dur);
      if (reason) { showBar('Nie przeniesiono: ' + reason, 'warn'); return { ok: false, reason }; }
      const prev = { col: cur.col, start: cur.start };
      cfg.commit(id, col, start);
      showBar(`Przeniesiono: ${cfg.label(id)} na ${fmt(start)}${cfg.colName(col)}. Wyślemy SMS do klientki.`, 'ok', () => { cfg.commit(id, prev.col, prev.start); showBar('Cofnięto. Wizyta wróciła na ' + fmt(prev.start) + cfg.colName(prev.col) + '.', 'ok'); });
      requestAnimationFrame(() => { const n = cfg.root.querySelector(`[data-${cfg.attr}="${id}"]`); if (n) n.focus(); });
      return { ok: true };
    }

    function begin(e) {
      const r = d.el.getBoundingClientRect();
      d.active = true; d.dx = d.x0 - r.left; d.dy = d.y0 - r.top; d.cur = cfg.place(d.id);
      const g = d.el.cloneNode(true);
      g.removeAttribute('id'); g.removeAttribute(`data-${cfg.attr}`); g.removeAttribute('href'); g.classList.add('kal-ghost');
      g.style.width = r.width + 'px'; g.style.height = r.height + 'px'; g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
      document.body.appendChild(g); d.ghost = g; d.el.classList.add('kal-src');
      document.body.classList.add('kal-dragging');
      try { d.el.setPointerCapture(d.pid); } catch (_) { /* element może już nie istnieć */ }
      move(e);
    }
    function move(e) {
      d.ghost.style.left = e.clientX - d.dx + 'px'; d.ghost.style.top = e.clientY - d.dy + 'px';
      const cols = cfg.cols();
      let col = cols.find(c => { const r = c.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; });
      if (!col) col = cols.reduce((a, c) => { const r = c.getBoundingClientRect(), da = Math.abs(e.clientX - (r.left + r.right) / 2); return !a || da < a.d ? { c, d: da } : a; }, null).c;
      const cr = col.getBoundingClientRect();
      const start = clampStart(cfg.startMin + (e.clientY - d.dy - cr.top - cfg.top0) / cfg.ppm, d.cur.dur);
      const reason = cfg.check(d.id, col, start, d.cur.dur);
      if (ind.parentNode !== col) col.appendChild(ind);
      ind.style.top = (start - cfg.startMin) * cfg.ppm + cfg.top0 + 'px'; ind.style.height = Math.max(40, d.cur.dur * cfg.ppm - 4) + 'px';
      ind.className = 'kal-ind' + (reason ? ' bad' : ''); ind.textContent = fmt(start) + (reason ? ' · zajęte' : '');
      d.target = { col, start };
    }
    function end(apply) {
      const x = d; d = null;
      clearTimeout(x.timer);
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onCancel); document.removeEventListener('keydown', onKey, true);
      if (!x.active) return;
      dragged = true; setTimeout(() => { dragged = false; }, 50); // zjedz click wywołany po upuszczeniu
      x.ghost.remove(); ind.remove(); x.el.classList.remove('kal-src'); document.body.classList.remove('kal-dragging');
      try { x.el.releasePointerCapture(x.pid); } catch (_) { /* już zwolniony */ }
      if (apply && x.target && !(x.target.col === x.cur.col && x.target.start === x.cur.start)) tryMove(x.id, x.target.col, x.target.start);
    }
    const onMove = e => {
      if (!d || e.pointerId !== d.pid) return;
      if (!d.active) {
        const far = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
        if (d.touch) { if (far > 8) end(false); return; } // dotyk: ruch przed przytrzymaniem to przewijanie
        if (far > 6) begin(e);
        return;
      }
      move(e);
    };
    const onUp = e => { if (d && e.pointerId === d.pid) end(true); };
    const onCancel = e => { if (d && e.pointerId === d.pid) end(false); };
    const onKey = e => { if (e.key === 'Escape' && d) end(false); };
    document.addEventListener('touchmove', e => { if (d && d.active) e.preventDefault(); }, { passive: false });

    cfg.root.addEventListener('pointerdown', e => {
      const el = e.target.closest(sel);
      if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
      d = { el, id: idOf(el), pid: e.pointerId, x0: e.clientX, y0: e.clientY, touch: e.pointerType === 'touch', active: false };
      if (d.touch) d.timer = setTimeout(() => { if (d && !d.active) { begin(e); } }, 350);
      document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onCancel); document.addEventListener('keydown', onKey, true);
    });
    cfg.root.addEventListener('dragstart', e => { if (e.target.closest(sel)) e.preventDefault(); });
    cfg.root.addEventListener('click', e => { if (dragged && e.target.closest(sel)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    cfg.root.addEventListener('contextmenu', e => { if (d && d.active) e.preventDefault(); });

    // klawiatura: Alt + strzałki (góra/dół: o krok czasu, lewo/prawo: sąsiednia kolumna)
    cfg.root.addEventListener('keydown', e => {
      const el = e.target.closest(sel);
      if (!el || !e.altKey || !e.key.startsWith('Arrow')) return;
      e.preventDefault();
      const id = idOf(el), cur = cfg.place(id), cols = cfg.cols(), i = cols.indexOf(cur.col);
      let col = cur.col, start = cur.start;
      if (e.key === 'ArrowUp') start -= cfg.snap; if (e.key === 'ArrowDown') start += cfg.snap;
      if (e.key === 'ArrowLeft') col = cols[Math.max(0, i - 1)]; if (e.key === 'ArrowRight') col = cols[Math.min(cols.length - 1, i + 1)];
      if (start < cfg.startMin || start + cur.dur > cfg.endMin) { showBar('Nie przeniesiono: poza godzinami kalendarza.', 'warn'); return; }
      if (col !== cur.col || start !== cur.start) tryMove(id, col, start);
    });
    return { tryMove };
  }
  window.KalDrag = { attach, showBar, fmt };
})();
