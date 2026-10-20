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
  const happyToday = (d = teraz()) => happyHours().filter(h => h.on && h.naGlownej && h.dni.includes(weekday(d)));

  // "Today" for the whole mock is the device's date and time. A test date pins it for demos and tests (Narzędzia makiety, or the address):
  // ?dzis=2026-10-20 pins the day (the clock stays real), ?dzis=2026-10-20T18:30 also the time, ?dzis=teraz goes back to the device.
  // Visits store their day as "wt 20.10" (krotko), without the year.
  const PIN = PREFIX + 'dzis', PIN_OK = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
  function ustawDzis(v) { try { if (v && PIN_OK.test(v)) localStorage.setItem(PIN, v); else localStorage.removeItem(PIN); } catch {} }
  const testowa = () => { try { const p = localStorage.getItem(PIN); return p && PIN_OK.test(p) ? p : null; } catch { return null; } };
  { const q = new URLSearchParams(location.search).get('dzis'); if (q === 'teraz') ustawDzis(null); else if (PIN_OK.test(q || '')) ustawDzis(q); }
  function teraz() {
    const p = testowa(); if (!p) return new Date();
    const [y, m, d] = p.slice(0, 10).split('-').map(Number), n = new Date();
    const [h, mi] = p.length > 10 ? p.slice(11).split(':').map(Number) : [n.getHours(), n.getMinutes()];
    return new Date(y, m - 1, d, h, mi, p.length > 10 ? 0 : n.getSeconds()); // the pinned day, at the pinned or the real time of day
  }
  const dzien = (n = 0) => { const t = teraz(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() + n); }; // today + n days, at 00:00
  const SKR = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
  const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const MIES = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const MIESD = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const p2 = n => String(n).padStart(2, '0');
  const dm = d => `${d.getDate()}.${p2(d.getMonth() + 1)}`; // "20.10"
  const krotko = d => `${SKR[d.getDay()]} ${dm(d)}`; // "wt 20.10"
  const dlugo = d => { const s = `${DNI[d.getDay()]}, ${d.getDate()} ${MIESD[d.getMonth()]}`; return s[0].toUpperCase() + s.slice(1); }; // "Wtorek, 20 października"
  // "wt 20.10" -> Date; the year is the one that puts the day within half a year of today
  function zKrotko(s) {
    const m = /(\d{1,2})\.(\d{1,2})/.exec(s || ''); if (!m) return null;
    const t = dzien(0), d = new Date(t.getFullYear(), +m[2] - 1, +m[1]), pol = 183 * 864e5;
    if (d - t > pol) d.setFullYear(d.getFullYear() - 1); else if (t - d > pol) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  const odDzis = d => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - dzien(0)) / 864e5); // whole days from today
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
.mock-dzis{padding:2px 10px;border-radius:999px;background:#FFF1E0;color:#8A3B12;font-weight:700;white-space:nowrap}
.mock-zglos:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}
@media (max-width:1023px){input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),select,textarea{font-size:16px !important}}
/* Netlify's injected badge covered the creators' 72 px bottom bar (Dalej button) */
@media (max-width:1023px){#nl-badge-frame{bottom:80px !important}}
@media (prefers-reduced-motion:reduce){.mock-toast{transition:none}}
/* booking steps (termin, zadatek): <ol class="kroki"> with li.ok for done steps and aria-current="step" */
.kroki{display:flex;gap:6px;margin:0;padding:12px 20px 0;list-style:none;font:12px 'DM Sans',system-ui,sans-serif;color:#625860}
.kroki li{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.kroki li::before{content:"";height:4px;border-radius:2px;background:#E4D9DE}
.kroki li.ok::before,.kroki li[aria-current]::before{background:#9E1F50}
.kroki li[aria-current]{color:#1E1A1D;font-weight:700}
.kroki .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (min-width:1024px){.kroki{max-width:560px;padding-left:0;padding-right:0}}`;

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
      const n = Object.assign(document.createElement('button'), { type: 'button', className: 'mock-zglos', textContent: 'Narzędzia' });
      n.addEventListener('click', () => import('./narzedzia.js').then(m => m.otworz()).catch(() => toast('Nie udało się otworzyć narzędzi.')));
      bar.append(' · ', b, ' ', n);
      if (testowa()) { // a pinned date must not be forgotten: it changes every page
        const t = teraz(), d = Object.assign(document.createElement('span'), { className: 'mock-dzis', textContent: `Data testowa: ${krotko(t)}, ${t.getHours()}:${p2(t.getMinutes())}` });
        bar.append(' · ', d);
      }
    }
  }

  // category → sample photo for small thumbnails (booking summary, visit cards) instead of flat colour blocks
  const FOTO = { Paznokcie: 'k-paznokcie', 'Rzęsy': 'k-rzesy', Brwi: 'k-brwi', Fryzjer: 'k-fryzjer', Kosmetyka: 'k-kosmetyka', Kosmetologia: 'k-kosmetyka' };
  const fotoKat = k => `zdjecia/${FOTO[k] || 'k-paznokcie'}.jpg`;

  // Polish tax id: 10 digits, last one = weighted sum of the first nine mod 11 (10 is never valid)
  const nipOk = s => { const d = String(s || '').replace(/[\s-]/g, ''); if (!/^\d{10}$/.test(d)) return false;
    const k = [6, 5, 7, 2, 3, 4, 5, 6, 7].reduce((a, w, i) => a + w * d[i], 0) % 11; return k !== 10 && k === +d[9]; };

  // referral invite (potwierdzenie, konto): system share sheet, else copy; the friend lands on the studio page with ?polec
  async function polec(studio, imie) {
    const url = new URL(`salon.html?s=${encodeURIComponent(studio)}&polec=1${imie ? '&od=' + encodeURIComponent(imie) : ''}`, location.href).href;
    const text = `Polecam ${studio}. Z tym linkiem masz 20 zł zniżki na pierwszą wizytę:`;
    try { if (navigator.share) { await navigator.share({ title: 'Zaproszenie do studia', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); toast('Skopiowano zaproszenie z linkiem'); } catch { toast('Link: ' + url); }
  }

  window.Mock = { get, set, reset, lookup, toast, addVisit, bindTexts, zl, dur, plural,
    happyHours, setHappyHours, promoFor, happyToday, priceAfter, weekday, fotoKat, nipOk, polec,
    teraz, dzien, SKR, MIES, MIESD, dm, krotko, dlugo, zKrotko, odDzis, ustawDzis, testowa };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

  console.assert((() => {
    try { localStorage.setItem(PREFIX + '__t', '1'); } catch { return true; } // no storage: nothing to check
    set('__t', { a: { b: 2 } }); const ok = lookup('__t.a.b') === 2; localStorage.removeItem(PREFIX + '__t'); return ok;
  })(), 'mock.js store lookup');
  console.assert(fotoKat('Rzęsy') === 'zdjecia/k-rzesy.jpg' && fotoKat('Kosmetologia') === 'zdjecia/k-kosmetyka.jpg' && fotoKat(undefined) === 'zdjecia/k-paznokcie.jpg', 'mock.js fotoKat');
  console.assert(krotko(new Date(2026, 9, 20)) === 'wt 20.10' && dlugo(new Date(2026, 9, 20)) === 'Wtorek, 20 października'
    && odDzis(dzien(40)) === 40 && odDzis(zKrotko(krotko(dzien(40)))) === 40 && odDzis(zKrotko(krotko(dzien(-150)))) === -150 && zKrotko('bez daty') === null && PIN_OK.test('2026-10-20T18:30') && !PIN_OK.test('2026-10-20 18:30'), 'mock.js daty');
  console.assert(nipOk('123-456-32-18') && !nipOk('1234563217') && !nipOk('12345') && !nipOk(''), 'mock.js nipOk');
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
