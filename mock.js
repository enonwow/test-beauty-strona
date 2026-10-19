// Shared behaviour for the clickable mockups. Pages opt in with data-* attributes (see design/SPEC-NOC.md).
// Nothing here talks to a server: state lives in localStorage under "mock.*" and survives page changes.
(function () {
  const PREFIX = 'mock.';

  function get(key, fallback) {
    try { const v = localStorage.getItem(PREFIX + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* private mode: page still works */ }
  }
  function reset() {
    try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch {}
  }
  // "booking.cena" -> get('booking').cena
  function lookup(path) {
    const [key, ...rest] = path.split('.');
    return rest.reduce((o, k) => (o == null ? o : o[k]), get(key));
  }

  function toast(msg) {
    let box = document.getElementById('mock-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'mock-toast';
      box.className = 'mock-toast';
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.add('on');
    clearTimeout(box._t);
    box._t = setTimeout(() => box.classList.remove('on'), 2200);
  }

  function addVisit(v) {
    const list = get('visits', []);
    list.unshift({ id: Date.now(), ...v });
    set('visits', list);
    return list;
  }

  // Groups whose buttons carry inline styles for both states: remember one style per state and swap it.
  // Delegated, so buttons a page renders later with its own script work too.
  const CHOICE_ITEM = 'button, [role="tab"], a[aria-pressed]';
  const stateAttr = el => (el.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-pressed');
  function choiceItems(group) {
    return [...group.querySelectorAll(CHOICE_ITEM)].filter(b => b.closest('[data-choice]') === group);
  }
  function choiceStyles(group, items) {
    if (!group._on) { const el = items.find(b => b.getAttribute(stateAttr(b)) === 'true'); if (el) group._on = el.getAttribute('style'); }
    if (!group._off) { const el = items.find(b => b.getAttribute(stateAttr(b)) !== 'true'); if (el) group._off = el.getAttribute('style'); }
  }
  function choiceClick(b, e) {
    const group = b.closest('[data-choice]');
    const items = choiceItems(group);
    choiceStyles(group, items);
    const paint = (x, on) => {
      x.setAttribute(stateAttr(x), String(on));
      const s = on ? group._on : group._off;
      if (s) x.setAttribute('style', s);
    };
    if (b.tagName === 'A') e.preventDefault();
    if (group.dataset.choice === 'multi') paint(b, b.getAttribute(stateAttr(b)) !== 'true');
    else items.forEach(o => paint(o, o === b));
    // tabs: show the panel named in aria-controls, hide its siblings' panels
    if (b.getAttribute('aria-controls')) items.forEach(o => {
      const p = document.getElementById(o.getAttribute('aria-controls'));
      if (p) p.hidden = o !== b;
    });
    group.dispatchEvent(new CustomEvent('mock:choice', { bubbles: true, detail: { value: b.dataset.value || b.textContent.trim(), button: b } }));
  }

  // Happy hours set by the studio (panel: promocje.html), shown to clients (start, salon, termin).
  // dni: 0 = poniedziałek … 6 = niedziela; od/do: "HH:MM", a visit qualifies when it starts in [od, do).
  const HAPPY_SEED = [
    { id: 'hh-poranki', nazwa: 'Poranki w tygodniu', on: true, rabat: 20, dni: [0, 1, 2, 3, 4], od: '09:00', do: '12:00', kategorie: ['Paznokcie', 'Rzęsy'], limit: 10, naGlownej: true },
    { id: 'hh-sroda', nazwa: 'Środowe popołudnie', on: true, rabat: 15, dni: [2], od: '14:00', do: '17:00', kategorie: ['Brwi'], limit: 0, naGlownej: true },
    { id: 'hh-sobota', nazwa: 'Sobotni finisz', on: false, rabat: 10, dni: [5], od: '16:00', do: '18:00', kategorie: [], limit: 0, naGlownej: false }
  ];
  const happyHours = () => get('happyHours', HAPPY_SEED);
  const setHappyHours = list => set('happyHours', list);
  const weekday = d => (d.getDay() + 6) % 7; // JS Sunday=0 -> Monday=0
  // Best active offer for a category at a day index and start time; kategorie [] means all services.
  function promoFor(kategoria, dzien, godzina) {
    const hit = happyHours().filter(h => h.on && h.dni.includes(dzien) && godzina >= h.od && godzina < h.do
      && (!h.kategorie.length || h.kategorie.includes(kategoria)));
    return hit.sort((a, b) => b.rabat - a.rabat)[0] || null;
  }
  const happyToday = (d = new Date()) => happyHours().filter(h => h.on && h.naGlownej && h.dni.includes(weekday(d)));
  const priceAfter = (cena, rabat) => Math.round(cena * (100 - rabat) / 100);

  const zl = n => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n))} zł`;
  const dur = m => { const h = Math.floor(m / 60), r = m % 60; return [h && `${h} h`, r && `${r} min`].filter(Boolean).join(' ') || '0 min'; };
  // Polish plural: plural(5, ['klientka', 'klientki', 'klientek']) -> "5 klientek"
  const plural = (n, [one, few, many]) => {
    const d = n % 10, t = n % 100;
    return `${n} ${n === 1 ? one : d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many}`;
  };

  function act(el, e) {
    const d = el.dataset;
    if (d.open) { const dlg = document.querySelector(d.open); if (dlg && dlg.showModal) { e.preventDefault(); dlg.showModal(); } }
    if (d.close !== undefined) { const dlg = el.closest('dialog'); if (dlg) dlg.close(); }
    if (d.show) document.querySelectorAll(d.show).forEach(x => (x.hidden = false));
    if (d.hide) document.querySelectorAll(d.hide).forEach(x => (x.hidden = true));
    if (d.toggle) document.querySelectorAll(d.toggle).forEach(x => (x.hidden = !x.hidden));
    if (d.remove) { const x = el.closest(d.remove); if (x) x.remove(); }
    if (d.step) {
      const out = document.querySelector(d.target);
      if (out) {
        const min = Number(out.dataset.min ?? -Infinity), max = Number(out.dataset.max ?? Infinity);
        out.textContent = String(Math.min(max, Math.max(min, (Number(out.textContent) || 0) + Number(d.step))));
      }
    }
    if (d.reset !== undefined) reset();
    if (d.toast) toast(d.toast);
    if (d.go) { e.preventDefault(); setTimeout(() => (location.href = d.go), d.toast ? 600 : 0); }
    // back to wherever the visitor came from on this site; the href is the fallback for direct visits
    // and for pages further in the booking flow (termin → "Wróć do kreatora" → "Wróć" must not loop back to termin)
    if (d.back !== undefined && document.referrer.startsWith(location.origin + '/') && !/\/(termin|zadatek|wywiad|potwierdzenie)\.html/.test(document.referrer) && history.length > 1) { e.preventDefault(); history.back(); }
  }

  function bindTexts(root) {
    root.querySelectorAll('[data-bind]').forEach(el => {
      const v = lookup(el.dataset.bind);
      if (v !== undefined && v !== null && v !== '') el.textContent = String(v);
    });
    root.querySelectorAll('[data-bind-if]').forEach(el => { el.hidden = !lookup(el.dataset.bindIf); });
    root.querySelectorAll('[data-bind-unless]').forEach(el => { el.hidden = !!lookup(el.dataset.bindUnless); });
  }

  const CSS = `
.mock-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);max-width:calc(100% - 32px);padding:12px 18px;border-radius:12px;background:#1E1A1D;color:#FFFFFF;font:14px 'DM Sans',system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:1000}
.mock-toast.on{opacity:1;transform:translate(-50%,0)}
dialog{width:min(440px,calc(100% - 32px));box-sizing:border-box;padding:20px;border:0;border-radius:18px;color:#1E1A1D;font-family:'DM Sans',system-ui,sans-serif}
dialog::backdrop{background:rgba(30,26,29,.45)}
[hidden]{display:none !important}
.mock-zglos{min-height:28px;padding:2px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}
.mock-zglos:hover{background:rgba(255,255,255,.12)}
.mock-zglos:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}
@media (max-width:1023px){input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),select,textarea{font-size:16px !important}}
/* Netlify's injected badge covered the creators' 72 px bottom bar (Dalej button) */
@media (max-width:1023px){#nl-badge-frame{bottom:80px !important}}
@media (prefers-reduced-motion:reduce){.mock-toast{transition:none}}`;

  // injected at load (not in init) so [hidden] wins before first paint
  const style = document.createElement('style');
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  function init() {
    document.querySelectorAll('[data-choice]').forEach(g => choiceStyles(g, choiceItems(g)));
    document.addEventListener('click', e => {
      const item = e.target.closest(CHOICE_ITEM);
      if (item && item.closest('[data-choice]') && !item.disabled) choiceClick(item, e);
      const el = e.target.closest('[data-open],[data-close],[data-show],[data-hide],[data-toggle],[data-remove],[data-step],[data-reset],[data-toast],[data-go],[data-back]');
      if (el && !el.matches('form')) act(el, e);
    });
    document.addEventListener('submit', e => {
      const f = e.target;
      if (!f.matches('form[data-mock]')) return;
      e.preventDefault();
      const dlg = f.closest('dialog');
      if (dlg) dlg.close();
      act(f, e);
    });
    document.addEventListener('change', e => { if (e.target.dataset.toastChange) toast(e.target.dataset.toastChange); });
    bindTexts(document);
    // "Zgłoś problem" in the mock bar on every page; the dialog code loads only when someone clicks it
    const bar = document.querySelector('.mock-bar');
    if (bar) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'mock-zglos', textContent: 'Zgłoś problem' });
      b.addEventListener('click', () => import('./zgloszenie.js').then(m => m.otworz()).catch(() => toast('Nie udało się otworzyć formularza.')));
      bar.append(' · ', b);
    }
  }

  window.Mock = { get, set, reset, lookup, toast, addVisit, bindTexts, zl, dur, plural,
    happyHours, setHappyHours, promoFor, happyToday, priceAfter, weekday };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

  console.assert((() => {
    try { localStorage.setItem(PREFIX + '__t', '1'); } catch { return true; } // no storage: nothing to check
    set('__t', { a: { b: 2 } }); const ok = lookup('__t.a.b') === 2; localStorage.removeItem(PREFIX + '__t'); return ok;
  })(), 'mock.js store lookup');
  console.assert(zl(-15) === '−15 zł' && dur(105) === '1 h 45 min' && dur(60) === '1 h' && plural(1, ['a', 'b', 'c']) === '1 a'
    && plural(3, ['a', 'b', 'c']) === '3 b' && plural(12, ['a', 'b', 'c']) === '12 c' && plural(22, ['a', 'b', 'c']) === '22 b', 'mock.js formats');
  console.assert((() => {
    const saved = localStorage.getItem(PREFIX + 'happyHours');
    try { localStorage.removeItem(PREFIX + 'happyHours'); } catch { return true; }
    const ok = promoFor('Paznokcie', 0, '10:15')?.rabat === 20 && promoFor('Paznokcie', 0, '12:00') === null
      && promoFor('Brwi', 0, '10:15') === null && promoFor('Brwi', 2, '14:30')?.rabat === 15
      && promoFor('Fryzjer', 5, '16:30') === null && priceAfter(140, 20) === 112 && weekday(new Date(2026, 9, 19)) === 0;
    if (saved !== null) localStorage.setItem(PREFIX + 'happyHours', saved);
    return ok;
  })(), 'mock.js happy hours');
})();
