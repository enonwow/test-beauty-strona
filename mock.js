// Shared behaviour for the clickable mockups. Pages opt in with data-* attributes (see design/SPEC-NOC.md).
// Nothing here talks to a server: state lives in localStorage under "mock.*" and survives page changes.
(function () {
  const PREFIX = 'mock.';
  // Studio locations: the panel works on the one picked in its header (Mock "lokalizacja"); client pages always book the main one (0)
  const lok = () => (document.getElementById('panel-nav') ? +get('lokalizacja', 0) || 0 : 0);
  const lokOf = x => +(x && x.lok) || 0; // location of a visit or a transaction
  // panel data kept per location: location 0 uses the plain key, location i the key "…@i"
  const PO_LOK = ['panel.tx', 'panel.mini', 'panel.week', 'kasa.ruch', 'kasa.zwroty', 'kasa.zamkniety', 'zespol.grafik', 'zespol.stan', 'zespol.wyn', 'zespol.role', 'koszty'];
  const klucz = key => (PO_LOK.includes(key) && lok() ? `${key}@${lok()}` : key);

  function get(key, fallback) {
    try { const v = localStorage.getItem(PREFIX + klucz(key)); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(PREFIX + klucz(key), JSON.stringify(value)); return true; } catch { return false; } // false: storage full or blocked, the caller decides
  }
  // feedback from tests and the test mode survive a data reset (feedback is deleted only on purpose, in Narzędzia makiety)
  const ZOSTAJE = [PREFIX + 'zgloszenia', PREFIX + 'tryb.test'];
  function reset() {
    try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX) && !ZOSTAJE.includes(k)).forEach(k => localStorage.removeItem(k)); } catch {}
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
  const fvNr = n => `FV/${n}/${p2(teraz().getMonth() + 1)}/${teraz().getFullYear()}`; // invoice number of the current month
  const krotko = d => `${SKR[d.getDay()]} ${dm(d)}`; // "wt 20.10"
  const dlugo = d => { const s = `${DNI[d.getDay()]}, ${d.getDate()} ${MIESD[d.getMonth()]}`; return s[0].toUpperCase() + s.slice(1); }; // "Wtorek, 20 października"
  // "wt 20.10" -> Date; the year is the one that puts the day within half a year of today
  function zKrotko(s) {
    const m = /(\d{1,2})\.(\d{1,2})/.exec(s || ''); if (!m) return null;
    const t = dzien(0), d = new Date(t.getFullYear(), +m[2] - 1, +m[1]), pol = 183 * 864e5;
    if (d - t > pol) d.setFullYear(d.getFullYear() - 1); else if (t - d > pol) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  const iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; // "2026-10-20", for <input type=date> and code dates

  // Discount codes set by the studio (promocje.html, tab "Kody") and typed by clients in termin.html.
  // typ 'proc' = percent, 'zl' = amount; kategorie [] = all services; limit 0 = no limit; od/do inclusive.
  const KODY_SEED = () => [
    { kod: 'JESIEN20', typ: 'proc', wart: 20, od: iso(dzien(-10)), do: iso(dzien(40)), kategorie: [], limit: 50, uzyto: 12, on: true },
    { kod: 'NOWA30', typ: 'zl', wart: 30, od: iso(dzien(-30)), do: iso(dzien(60)), kategorie: ['Rzęsy'], limit: 0, uzyto: 3, on: true },
    { kod: 'LATO15', typ: 'proc', wart: 15, od: iso(dzien(-120)), do: iso(dzien(-30)), kategorie: [], limit: 0, uzyto: 41, on: true }];
  const kody = () => get('kody', null) || KODY_SEED();
  const setKody = l => set('kody', l);
  // a typed code against the list: { kod, rabat, opis } or { blad } with a reason the client can act on
  function sprawdzKod(wpis, kategoria, kwota, lista = kody(), dzis = iso(teraz())) {
    const k = String(wpis || '').trim().toUpperCase(); if (!k) return null;
    const x = lista.find(z => z.kod === k && z.on);
    if (!x) return { blad: 'Nie znamy takiego kodu. Sprawdź pisownię.' };
    if (dzis < x.od) return { blad: `Kod działa od ${x.od.split('-').reverse().slice(0, 2).join('.')}.` };
    if (dzis > x.do) return { blad: 'Ten kod już wygasł.' };
    if (x.limit && x.uzyto >= x.limit) return { blad: 'Ten kod został już wykorzystany.' };
    if (x.kategorie.length && !x.kategorie.includes(kategoria)) return { blad: `Ten kod działa tylko na: ${x.kategorie.join(', ').toLowerCase()}.` };
    const rabat = Math.min(kwota, x.typ === 'proc' ? Math.round(kwota * x.wart / 100) : x.wart);
    return { kod: x.kod, rabat, opis: x.typ === 'proc' ? `−${x.wart}%` : `−${x.wart} zł` };
  }
  // Passes and packages (karnety.html sells them in the studio, salon.html online). Sold: { k, tel, n, t, us, cena, ile, data, do, doIso }
  // t 'pakiet' = ile visits left, t 'czasowy' = unlimited until doIso.
  const KARNETY_SEED = [
    { id: 1, n: 'Pakiet 5× hybryda', t: 'pakiet', cena: 600, ile: 5, dni: 180, us: 'Manicure hybrydowy' },
    { id: 2, n: 'Karnet miesięczny: hybryda bez limitu', t: 'czasowy', cena: 450, ile: 0, dni: 30, us: 'Manicure hybrydowy' },
    { id: 3, n: 'Pakiet 3× uzupełnienie rzęs', t: 'pakiet', cena: 400, ile: 3, dni: 120, us: 'Uzupełnienie rzęs 1:1' }];
  const karnety = () => get('karnety.oferta', KARNETY_SEED);
  // sample: two passes sold in the studio to clients from klientki.html; hist = deductions, newest first
  const SPRZEDANE_SEED = () => [
    { k: 'Basia W.', tel: '600 123 456', n: 'Pakiet 5× hybryda', t: 'pakiet', us: 'Manicure hybrydowy', cena: 600, ile: 3, wiz: 5, data: dzien(-50).toLocaleDateString('pl-PL'), do: dzien(130).toLocaleDateString('pl-PL'), doIso: iso(dzien(130)),
      hist: [{ d: iso(dzien(-21)), opis: 'Manicure hybrydowy · Magda', jak: 'odliczone przy rozliczeniu wizyty' }, { d: iso(dzien(-49)), opis: 'Manicure hybrydowy · Magda', jak: 'odliczone przy rozliczeniu wizyty' }] },
    { k: 'Anna K.', tel: '605 901 227', n: 'Pakiet 5× hybryda', t: 'pakiet', us: 'Manicure hybrydowy', cena: 600, ile: 4, wiz: 5, data: dzien(-21).toLocaleDateString('pl-PL'), do: dzien(159).toLocaleDateString('pl-PL'), doIso: iso(dzien(159)),
      hist: [{ d: iso(dzien(-7)), opis: 'Manicure hybrydowy', jak: 'odliczone ręcznie' }] }];
  // sample studios from the search results: address and team; the own studio (Studio Malwa) takes its address from Profil studia
  const STUDIA = { 'Studio Malwa': ['ul. Puławska 24, lok. 3, Warszawa', ['Magda', 'Ewelina']], 'Atelier Nude': ['ul. Mokotowska 12, Warszawa', ['Natalia', 'Zuzanna']],
    'Pracownia Lilia': ['ul. Słowackiego 8, Warszawa', ['Lilia', 'Kasia']], 'Lash Room Iga': ['ul. Wolska 40, Warszawa', ['Iga']], 'Salon Loft': ['ul. Grochowska 120, Warszawa', ['Ola', 'Natalia']] };
  const studio = n => { const s = STUDIA[n] || STUDIA['Studio Malwa'], own = !STUDIA[n] || n === 'Studio Malwa'; return { adres: (own && (get('profil', {}) || {}).ad) || s[0], zespol: s[1] }; };
  // opening hours per weekday (0 = Monday): [od, do, zamknięte] from the saved profile (profil-studia.html, onboarding.html)
  const GODZ0 = [0, 1, 2, 3, 4].map(() => ['9:00', '18:00', false]).concat([['9:00', '14:00', false], ['9:00', '14:00', true]]);
  const godziny = () => ((get('profil', {}) || {}).h || GODZ0);
  // a base service saved in cennik.html: [nazwa, cena, minuty, online, przerwa, osoby, dojazd] or null (no saved price list, unknown name)
  const cennikPoz = (kat, nazwa) => (((get('cennik.data', null) || {})[kat] || {}).base || []).find(b => b[0] === nazwa) || null;
  const sprzedane = () => get('karnety.sprzedane', null) || SPRZEDANE_SEED();
  const wizyt = s => s.wiz || (karnety().find(o => o.n === s.n) || {}).ile || s.ile; // passes sold before "wiz" was stored: size from the offer
  const kropki = (s, px = 10) => Array.from({ length: wizyt(s) }, (_, i) => `<i aria-hidden="true" style="width:${px}px;height:${px}px;border-radius:50%;display:inline-block;background:${i < wizyt(s) - s.ile ? '#E4D9DE' : '#9E1F50'}"></i>`).join('');
  // one visit off sold pass i, with a history line the client card shows and can undo; null when a package is used up
  function odlicz(i, opis, jak) {
    const l = sprzedane(), s = l[i]; if (!s || (s.t === 'pakiet' && s.ile < 1)) return null;
    if (s.t === 'pakiet') s.ile -= 1;
    s.hist = [{ d: iso(teraz()), opis, jak }, ...(s.hist || [])]; set('karnety.sprzedane', l); return s;
  }
  function cofnijOdlicz(i) {
    const l = sprzedane(), s = l[i]; if (!s || !(s.hist || []).length) return null;
    s.hist = s.hist.slice(1); if (s.t === 'pakiet') s.ile += 1; set('karnety.sprzedane', l); return s;
  }
  const ileZ = (s, n = s.ile) => `${n} z ${wizyt(s)}`;
  const zostaloZ = s => `${zostalo(s.ile).split(' ')[0]} ${ileZ(s)}`; // "zostały 3 z 5"
  const zostanie = n => plural(n, ['zostanie', 'zostaną', 'zostanie']).split(' ')[1]; // "zostaną" (2)
  function sprzedaj(o, kl) {
    const end = dzien(o.dni);
    set('karnety.sprzedane', [{ k: kl.n, tel: kl.tel, n: o.n, t: o.t, us: o.us, cena: o.cena, ile: o.ile, wiz: o.ile, data: dzien(0).toLocaleDateString('pl-PL'), do: end.toLocaleDateString('pl-PL'), doIso: iso(end), hist: [] }, ...sprzedane()]);
  }
  // "Odlicz wizytę" for panel pages (needs panel-shell.js): which visit, and the state after
  function odliczModal(i, done) {
    const s = sprzedane()[i], E = window.PS.esc, pak = s.t === 'pakiet', po = s.ile - 1;
    const W = get('visits', []).filter(v => v.status !== 'odwołana' && v.dzien && Math.abs(odDzis(zKrotko(v.dzien))) <= 30
      && (cyfry(s.tel) ? cyfry(v.tel || (v.kontakt || {}).tel) === cyfry(s.tel) : v.klientka === s.k)).map(v => [`${v.dzien}${v.godzina ? ', ' + v.godzina : ''} · `, [v.usluga, v.stylistka].filter(Boolean).join(' · ')]);
    const opcje = W.concat([['dziś · ', s.us], ['', 'wizyta spoza kalendarza']]).map(([a, b]) => `<option value="${E(b)}">${E(a + b)}</option>`).join('');
    window.PS.modal({ title: 'Odlicz wizytę z karnetu', ok: 'Odlicz',
      body: `<span><b>${E(s.k)}</b> · ${E(s.n)} · ${pak ? zostaloZ(s) : 'ważny do ' + E(s.do)}</span>
        <label class="p-lab">Za którą wizytę<select class="p-in" name="w">${opcje}</select></label>
        ${pak ? `<div class="p-box"><span>Po odliczeniu</span><b>${po ? zostanie(po) + ' ' + ileZ(s, po) : 'pakiet wykorzystany'}</b></div>` : ''}
        <span class="p-mut" style="font-size:13px">Odliczenie trafi do historii karnetu na karcie klientki. Pomyłkę cofniesz tam przyciskiem „Cofnij”.</span>`,
      onOk: f => { odlicz(i, f.w.value, 'odliczone ręcznie'); done(); },
      toast: `Odliczono wizytę: ${s.k}${pak ? ', ' + (po ? zostalo(po) : 'pakiet wykorzystany') : ''}` });
  }
  // studio clients by name and phone (klientki.html shows the cards, karnety.html sells to them); phones match the calendar
  const KLIENTKI = [{ id: 'b', n: 'Basia W.', tel: '600 123 456' }, { id: 'd', n: 'Dorota S.', tel: '602 118 940' }, { id: 'f', n: 'Felicja R.', tel: '604 772 315' }, { id: 'a', n: 'Anna K.', tel: '605 901 227' }];
  const klientki = () => { const s = get('klientki.state', {}) || {}; return KLIENTKI.concat(s.extra || []).filter(c => !(s.del || []).includes(c.id)).map(c => ({ id: c.id, n: c.n, tel: c.tel })); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); // user text into HTML
  const cyfry = s => String(s || '').replace(/\D/g, '').slice(-9); // phone numbers compared by their last 9 digits
  // the logged-in client's own visit (by phone, else by name); without an account every visit in this browser counts
  const moja = v => { const u = get('user', {}) || {}, k = v.kontakt || {}, t = cyfry(k.tel || v.tel); if (!u.zalogowana) return true; return cyfry(u.tel) && t ? t === cyfry(u.tel) : !!u.imie && (k.imie || v.klientka) === u.imie; };
  // a consent signed by this client: tablet signatures at the studio belong to the client named on them
  const mojPodpis = p => { const u = get('user', {}) || {}; return !p.przyklad && (!/studiu/.test(p.sposob || '') || (!!u.imie && p.klientka === u.imie)) && (!u.zalogowana || !u.imie || !p.klientka || p.klientka === 'Klientka' || p.klientka === u.imie); };
  // the first pass of this client (by phone, else by name) that covers the service today
  function karnetDla(usluga, tel, imie, lista = sprzedane(), dzis = iso(teraz())) {
    const i = lista.findIndex(s => s.us === usluga && (cyfry(tel) ? cyfry(s.tel) === cyfry(tel) : imie && s.k === imie)
      && (!s.doIso || dzis <= s.doIso) && (s.t === 'czasowy' || s.ile > 0));
    return i < 0 ? null : { i, s: lista[i] };
  }
  // Complaints after a visit (wizyty.html files them, opinie-studio.html answers). status: nowa | poprawka | zwrot | odrzucona
  const REKL_SEED = () => [{ id: 'rk1', visitId: null, klientka: 'Anna K.', usluga: 'Hybryda jednolita', cena: 140, opis: 'Po trzech dniach odprysk na dwóch paznokciach prawej dłoni.', oczekuje: 'poprawka', foto: 'dlon.jpg', data: iso(dzien(-1)), status: 'nowa', przyklad: true }];
  const reklamacje = () => get('reklamacje', null) || REKL_SEED();
  const setReklamacje = l => set('reklamacje', l);
  // Private survey after a visit (ocena.html asks, raporty.html and the client card in klientki.html read). wroci: Tak | Raczej tak | Nie
  const ANK_SEED = () => [['Basia W.', 'Tak', 'czekanie na początek', -21], ['Anna K.', 'Nie', 'czekanie na początek', -35], ['Dorota S.', 'Raczej tak', '', -63], ['Celina M.', 'Tak', 'za zimno w gabinecie', -12], ['Ela K.', 'Tak', 'czekanie na początek', -8]]
    .map(([klientka, wroci, uwagi, d]) => ({ klientka, studio: 'Studio Malwa', opis: 'Hybryda M', wroci, uwagi, data: iso(dzien(d)) }));
  const ankiety = () => get('ankiety', null) || ANK_SEED();
  // answers, share of "Tak"/"Raczej tak" in % (null when nobody answered that question), the most frequent remark (same text, case ignored) and how many times
  function ankietyWynik(l) {
    const ile = {}; l.forEach(a => { const u = (a.uwagi || '').trim().toLowerCase(); if (u) ile[u] = (ile[u] || 0) + 1; });
    const top = Object.entries(ile).sort((a, b) => b[1] - a[1])[0];
    const odp = l.filter(a => a.wroci); // a client may skip the question and only leave a remark
    return { n: l.length, wroci: odp.length ? Math.round(odp.filter(a => a.wroci !== 'Nie').length / odp.length * 100) : null, uwaga: top ? top[0] : '', razy: top ? top[1] : 0 };
  }
  console.assert((r => r.n === 4 && r.wroci === 67 && r.uwaga === 'kolejka' && r.razy === 2)(ankietyWynik([{ wroci: 'Tak', uwagi: 'Kolejka' }, { wroci: 'Nie', uwagi: 'kolejka ' }, { wroci: 'Raczej tak', uwagi: '' }, { wroci: '', uwagi: 'zimno' }])) && ankietyWynik([]).wroci === null && ankietyWynik([{ wroci: '', uwagi: 'zimno' }]).wroci === null, 'Mock ankietyWynik');
  // Stock (magazyn.html, products used on a visit in panel.html) and aftercare texts per category (cennik.html, wizyty.html, marketing.html)
  const MAGAZYN_SEED = [
    { n: 'Lakier hybrydowy, burgund', k: 'Paznokcie', s: 6, p: 2, u: 'szt.' }, { n: 'Żel budujący, przezroczysty', k: 'Paznokcie', s: 2, p: 3, u: 'szt.' },
    { n: 'Baza hybrydowa', k: 'Paznokcie', s: 4, p: 2, u: 'szt.' }, { n: 'Top bez przemywania', k: 'Paznokcie', s: 3, p: 2, u: 'szt.' }, { n: 'Velvet, puder', k: 'Paznokcie', s: 5, p: 2, u: 'szt.' },
    { n: 'Klej do rzęs', k: 'Rzęsy', s: 3, p: 2, u: 'szt.' }, { n: 'Rzęsy 0,07 C 12 mm', k: 'Rzęsy', s: 8, p: 3, u: 'taśm' }, { n: 'Płatki hydrożelowe', k: 'Rzęsy', s: 10, p: 4, u: 'par' },
    { n: 'Henna do brwi, brąz', k: 'Brwi', s: 4, p: 2, u: 'szt.' }];
  const magazyn = () => get('magazyn', null) || MAGAZYN_SEED.map(x => ({ ...x, partie: PARTIE_SEED()[x.n] || [] }));
  const ZAL_SEED = {
    Paznokcie: 'Przez 24 h unikaj gorącej wody i sauny. Do sprzątania zakładaj rękawiczki. Nie podważaj odprysków: przyjdź na bezpłatną poprawkę. Smaruj skórki oliwką raz dziennie.',
    'Rzęsy': 'Przez 24 h nie mocz rzęs i unikaj pary. Nie używaj tłustych kosmetyków do oczu. Czesz rzęsy szczoteczką rano. Nie śpij twarzą w poduszce przez pierwszą noc.',
    Brwi: 'Przez 24 h nie myj brwi i nie nakładaj makijażu. Unikaj peelingów okolicy brwi przez 3 dni.',
    Fryzjer: 'Myj włosy szamponem do włosów farbowanych, pierwszy raz po 48 h. Chroń kolor przed słońcem i chlorem.',
    Kosmetologia: 'Przez 3 dni unikaj słońca, sauny i basenu. Stosuj krem z filtrem SPF 50. Nie drap i nie zdzieraj złuszczającego się naskórka.' };
  const zalecenia = () => ({ ...ZAL_SEED, ...(get('zalecenia', {}) || {}) });

  // --- Etap A: payment at booking, stations, expiry dates, team tasks ---
  // Payment at booking (ustawienia.html): 'brak' | 'zaliczka' | 'calosc'. Older data only had the deposit switch "studioZadatek".
  const platnoscTryb = () => get('studioPlatnosc', null) || (get('studioZadatek', true) ? 'zaliczka' : 'brak');
  const setPlatnoscTryb = t => { set('studioPlatnosc', t); set('studioZadatek', t !== 'brak'); };
  // studio settings from ustawienia.html: free cancellation window (hours) and the deposit in % of the price
  const odwH = () => +get('ustaw.odwH', 24) || 24, zalProc = () => +get('ustaw.zalProc', 30) || 30;
  const zaliczka = cena => Math.ceil(cena * zalProc() / 100);
  // a visit's "platnosc": { status, kwota, rodzaj, metoda, czas (ISO), nr, do ("HH:MM": a failed one keeps the slot until then), zwrot }
  const PLATNOSC = { oczekuje: ['oczekuje', '#FFF1E0', '#8A3B12'], 'opłacona': ['opłacona', '#E6F2EC', '#1F6B47'], nieudana: ['płatność nieudana', '#FDECEC', '#A3262A'], 'zwrócona': ['zwrócona', '#EAF0F7', '#2F5A86'] };
  const platnoscBadge = s => { const b = PLATNOSC[s] || PLATNOSC.oczekuje; return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:${b[1]};color:${b[2]};font-size:12px;font-weight:700;white-space:nowrap">${b[0]}</span>`; };
  // cancelling: on time the whole prepayment goes back; late, a full prepayment keeps the deposit part. Returns the fields to merge into the visit.
  function zwrotPrzyOdwolaniu(v, wczesnie) {
    const p = v.platnosc;
    const kw = !p ? (wczesnie && +v.zadatek) || 0 : p.status !== 'opłacona' ? 0 : wczesnie ? p.kwota : p.rodzaj === 'calosc' ? Math.max(0, p.kwota - zaliczka(+v.cena || 0)) : 0;
    return kw ? { zwrot: true, ...(p ? { platnosc: { ...p, status: 'zwrócona', zwrot: kw } } : {}) } : {};
  }
  // the one wording of what happens to a prepayment { kwota, rodzaj } on cancelling: zadatek.html (rules), potwierdzenie.html and wizyty.html (cancel dialogs)
  function zwrotTekst(p, cena, wczesnie) {
    const zw = (zwrotPrzyOdwolaniu({ cena, platnosc: { ...p, status: 'opłacona' } }, wczesnie).platnosc || {}).zwrot || 0;
    return zw === p.kwota ? `${zw} zł wróci w ciągu 5 dni roboczych` : zw ? `studio zatrzyma ${p.kwota - zw} zł (${zalProc()}%), ${zw} zł wróci w ciągu 5 dni roboczych` : `zaliczki ${p.kwota} zł nie zwracamy`;
  }
  // Stations (zespol.html edits the list; cennik.html picks one per service; panel.html and termin.html keep two visits off the same one)
  const STAN_SEED = [
    { n: 'Stanowisko 1', o: 'Paznokcie · Magda', sp: 'Lampa UV/LED, frezarka, odciąg pyłu', us: ['Hybryda', 'Żel', 'Przedłużanie'] },
    { n: 'Stanowisko 2', o: 'Rzęsy i brwi · Ewelina', sp: 'Leżanka, lampa z lupą, stolik na kleje', us: ['Rzęsy 1:1–mega', 'Brwi'] },
    { n: 'Stanowisko 3', o: 'Paznokcie · Ewelina', sp: 'Lampa UV/LED, frezarka', us: ['Hybryda', 'Żel'] },
    { n: 'Gabinet kosmetyczny', o: 'Kosmetyka (przykład)', sp: 'Leżanka, lampa, zestaw do peelingów', us: ['Oczyszczanie', 'Peeling kwasowy'] }];
  const STAN_SEED1 = [ // the second location (Mokotów, hair)
    { n: 'Fotel 1', o: 'Strzyżenie · Ola', sp: 'Fotel hydrauliczny, lustro, suszarka', us: ['Strzyżenie', 'Modelowanie'] },
    { n: 'Fotel 2', o: 'Koloryzacja · Natalia', sp: 'Fotel, lampa do koloryzacji, waga do farb', us: ['Koloryzacja', 'Balejaż', 'Keratyna'] },
    { n: 'Myjnia', o: 'Wspólna', sp: 'Myjnia z fotelem', us: ['Mycie głowy'] }];
  const stanowiska = () => get('zespol.stan', null) || (lok() === 1 ? STAN_SEED1 : STAN_SEED).map(s => ({ ...s }));
  const stanSprzet = (s, caly) => { const t = (caly ? s.sp : String(s.sp || '').split(',')[0].trim()) || 'bez opisu'; return t[0].toLowerCase() + t.slice(1); }; // "lampa UV/LED"
  // default station of a service when cennik.html has no choice saved; '' = any station
  const STAN_USL = {}, STAN_KAT = { Paznokcie: 'Stanowisko 1', 'Rzęsy': 'Stanowisko 2', Brwi: 'Stanowisko 2', Kosmetyka: 'Gabinet kosmetyczny', Kosmetologia: 'Gabinet kosmetyczny' };
  function stanowiskoDla(usluga, kategoria, wybor = get('cennik.stan', {}) || {}, lista = stanowiska()) {
    const n = usluga in wybor ? wybor[usluga] : STAN_USL[usluga] ?? STAN_KAT[kategoria] ?? '';
    return lista.some(s => s.n === n) ? n : '';
  }
  // stations a visit holds: the one of every service in it (a cart of several), none for a home visit
  const stanowiskaWizyty = (v, lista = stanowiska()) => (v.dojazd ? [] : [...new Set((Array.isArray(v.uslugi) && v.uslugi.length ? v.uslugi : [v])
    .map(u => stanowiskoDla(u.usluga, u.kategoria || v.kategoria, undefined, lista)).filter(Boolean))]);
  // first visit [{od, do} in minutes] holding the station during [od, od + dl), with the cleaning break after each visit
  const kolizjaStan = (lista, od, dl, przerwa = 0) => lista.find(z => od < z.do + przerwa && z.od < od + dl + przerwa) || null;
  // Expiry dates: each product has "partie" [{ nr, wazne: ISO date, ile, utyl }], seeded relative to today
  const PARTIE_SEED = () => { const p = (nr, n, ile) => [{ nr, wazne: iso(dzien(n)), ile }];
    return { 'Lakier hybrydowy, burgund': p('LOT 24A19', 160, 6), 'Żel budujący, przezroczysty': p('LOT 2311', 24, 2), 'Baza hybrydowa': p('LOT 0921', 300, 4), 'Top bez przemywania': p('LOT 2209', -9, 1),
      'Velvet, puder': p('LOT 2402', 100, 5), 'Klej do rzęs': p('LOT K-77', 7, 3), 'Rzęsy 0,07 C 12 mm': p('LOT 0312', 240, 8), 'Henna do brwi, brąz': p('LOT H-18', 200, 4) }; };
  // 'przeterminowane' | 'kończy się' (30 days or less) | ''
  const waznosc = (p, dzis = iso(teraz())) => { if (!p || !p.wazne) return ''; const dni = Math.round((new Date(p.wazne) - new Date(dzis)) / 864e5); return dni < 0 ? 'przeterminowane' : dni <= 30 ? 'kończy się' : ''; };
  const waznePartie = (x, dzis) => (x.partie || []).filter(p => !p.utyl && waznosc(p, dzis) !== 'przeterminowane');
  // Team tasks (zespol.html, tab "Zadania"): { ogl: [{ id, od, t, czas }], lista: [{ id, t, kto, termin (ISO), godz, zrodlo, done, doneDzien, nowe }] }
  const ZADANIA_SEED = () => ({
    ogl: [{ id: 'o1', od: 'Joanna', t: 'W sobotę zamykamy o 13:00 (inwentaryzacja). Proszę nie przyjmować wizyt po 12:00.', czas: iso(dzien(0)) + 'T08:10' }],
    lista: [{ id: 'z1', t: 'Zamów klej do rzęs (zostały 3 szt.)', kto: 'Ewelina', termin: iso(dzien(1)), zrodlo: 'z alertu magazynu' },
      { id: 'z2', t: 'Oddzwoń do Celiny M. w sprawie French', kto: 'Magda', termin: iso(dzien(0)), godz: '16:00' },
      { id: 'z3', t: 'Odpowiedz na reklamację Anny K.', kto: 'Joanna', termin: iso(dzien(13)), zrodlo: 'z opinii' },
      { id: 'z4', t: 'Wymień filtr w odciągu pyłu', kto: 'Magda', termin: iso(dzien(-1)), done: true, doneDzien: iso(dzien(-1)) }] });
  const zadania = () => get('zadania', null) || ZADANIA_SEED();
  const setZadania = z => set('zadania', z);
  const OD = { Joanna: 'Joanny', Magda: 'Magdy', Ewelina: 'Eweliny' }, odKogo = n => (OD[n] ? 'od ' + OD[n] : n ? 'od: ' + n : ''); // "Ogłoszenie od Joanny"
  const odDzis = d => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - dzien(0)) / 864e5); // whole days from today
  const priceAfter = (cena, rabat) => Math.round(cena * (100 - rabat) / 100);

  const zl = n => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n))} zł`;
  const dur = m => { const h = Math.floor(m / 60), r = m % 60; return [h && `${h} h`, r && `${r} min`].filter(Boolean).join(' ') || '0 min'; };
  // Polish plural: plural(5, ['klientka', 'klientki', 'klientek']) -> "5 klientek"
  const plural = (n, [one, few, many]) => {
    const d = n % 10, t = n % 100;
    return `${n} ${n === 1 ? one : d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many}`;
  };
  // visits left on a pass, with the verb agreeing: "została 1 wizyta", "zostały 3 wizyty", "zostało 5 wizyt"
  const zostalo = n => { const w = plural(n, ['wizyta', 'wizyty', 'wizyt']); return (n === 1 ? 'została ' : w.endsWith('wizyty') ? 'zostały ' : 'zostało ') + w; };

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
/* an open modal (dialog, the "Kiedy" sheet on phones) locks the page behind it; scrolling inside it does not spill over */
html:has(dialog[open]),html:has(.kdim){overflow:hidden}
dialog,dialog *,.kpanel{overscroll-behavior:contain}
.mock-zglos{min-height:28px;padding:2px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}
.mock-zglos:hover{background:rgba(255,255,255,.12)}
.mock-uwagi{position:fixed;right:12px;bottom:88px;z-index:50;min-height:44px;padding:0 16px;border-radius:999px;border:0;background:#1E1A1D;color:#FFFFFF;font:700 14px 'DM Sans',sans-serif;box-shadow:0 6px 18px rgba(30,10,18,.25);cursor:pointer}
.mock-uwagi:focus-visible{outline:2px solid #9E1F50;outline-offset:2px}
@media (min-width:1024px){.mock-uwagi{bottom:20px;right:20px}}
.nav-x{display:none !important}
@media (min-width:1024px){.nav-x{display:flex !important}.nav-firma{margin-left:auto;border:1px solid #9E1F50;border-radius:10px;color:#9E1F50 !important;font-weight:700;min-height:44px !important}.nav-firma:hover{background:#F6EDF1}.nav.d-tabbar{display:flex;align-items:center}.nav.d-tabbar::before,.nav-firma{white-space:nowrap}.nav-firma{gap:0 !important}}
@media (min-width:1024px) and (max-width:1199px){.nav-firma-x{display:none}}
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
    // brand: the tab icon and name on every page
    document.querySelectorAll('link[rel=icon]').forEach(l => l.remove());
    document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="znak.svg" type="image/svg+xml">');
    if (!document.title.includes('Odcień')) document.title = (document.title ? document.title + ' · ' : '') + 'Odcień';
    document.querySelectorAll('[data-choice]').forEach(g => choiceStyles(g, choiceItems(g)));
    // participants type passwords by habit: every password field (not the 4-digit PINs) says it is a mock
    document.querySelectorAll('input[type=password][autocomplete$=password]').forEach(i => { const n = document.createElement('span'); n.textContent = 'To makieta: nie wpisuj hasła, którego używasz gdzie indziej.'; n.style.cssText = 'color:#8A3B12;font-size:12px'; (i.parentElement.tagName === 'DIV' && i.parentElement.children.length > 1 && !i.parentElement.querySelector('label') ? i.parentElement : i).insertAdjacentElement('afterend', n); });
    document.querySelectorAll('[data-zal-proc]').forEach(el => { el.textContent = zalProc(); }); // the studio's deposit %
    if (odwH() !== 24) document.querySelectorAll('[data-odw]').forEach(el => { el.innerHTML = el.innerHTML.replace(/24 h/g, odwH() + ' h'); }); // the studio's free-cancellation window
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
    // news and the studio sign-up in the shared top menu (desktop only: the phone tab bar keeps its 4 tabs)
    const tab = document.querySelector('.nav.d-tabbar');
    if (tab) tab.insertAdjacentHTML('beforeend', `<a href="aktualnosci.html" class="nav-x"${/aktualnosci\.html$/.test(location.pathname) ? ' aria-current="page"' : ''}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"></path><path d="M17 9h3v8a2 2 0 0 1-2 2"></path><path d="M8 9h5M8 13h5"></path></svg>Aktualności</a><a href="dla-studiow.html" class="nav-x nav-firma">Dla studiów<span class="nav-firma-x">: załóż konto salonu</span></a>`);
    // test links: ?test=1 / ?test=0 switches the test mode, ?reset=1 clears the data, ?scen=N opens a ready scenario (Narzędzia makiety)
    const P = new URLSearchParams(location.search);
    if (P.has('test')) set('tryb.test', P.get('test') === '1');
    if (P.has('reset') || P.has('scen')) {
      const czysty = () => { const q = new URLSearchParams(location.search); ['reset', 'scen', 'test', 'na'].forEach(k => q.delete(k)); return location.pathname.split('/').pop() + (q.toString() ? '?' + q : ''); };
      if (P.get('reset') === '1') reset();
      const na = /^[a-z-]+\.html$/.test(P.get('na') || '') ? P.get('na') : null; // &na=start.html: prepare the scenario, start the test on another page
      if (P.has('scen')) import('./narzedzia.js').then(m => { const u = m.scenariusz(+P.get('scen')); location.replace(na || u || czysty()); }).catch(() => location.replace(czysty()));
      else location.replace(czysty());
      return;
    }
    // "Zgłoś problem" in the mock bar on every page; the dialog code loads only when someone clicks it
    const bar = document.querySelector('.mock-bar');
    if (bar && get('tryb.test', false)) { // test mode: no mock bar and tools, one "Uwagi" button for feedback
      bar.hidden = true;
      document.querySelectorAll('.mock-only').forEach(el => { el.style.display = 'none'; }); // mock switches and hints are for the person running the test
      const u = Object.assign(document.createElement('button'), { type: 'button', className: 'mock-uwagi', textContent: 'Uwagi' });
      u.setAttribute('aria-label', 'Zgłoś uwagę albo problem');
      u.addEventListener('click', () => import('./zgloszenie.js').then(m => m.otworz()).catch(() => toast('Nie udało się otworzyć formularza.')));
      document.body.append(u);
    } else if (bar) {
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

  // Accounts for logging in: client (logowanie.html) and studio (panel-logowanie.html, onboarding, zaproszenie); listed in Narzędzia makiety.
  // Mock only: test passwords sit here in plain text so Narzędzia can show them; a real backend keeps only a hash.
  const KONTA_SEED = [
    { typ: 'studio', imie: 'Joanna Malec', email: 'joanna@example.com', tel: '600900100', haslo: 'Malwa2026', rola: 'właścicielka', przyklad: true },
    { typ: 'studio', imie: 'Ewelina', email: 'ewelina@example.com', tel: '600234567', haslo: 'Ewelina2026', rola: 'stylistka', przyklad: true },
    { typ: 'klientka', imie: 'Kasia', email: 'kasia@example.com', tel: '600100200', haslo: 'Kasia2026', zgody: { regulamin: true, marketing: false }, przyklad: true }];
  const konta = () => get('konta', null) || KONTA_SEED;
  // e-mail in any case or a phone with any spacing or +48 -> one comparable key
  const loginKlucz = s => (s = String(s || '').trim()).includes('@') ? s.toLowerCase() : s.replace(/\D/g, '').slice(-9);
  const konto = (typ, login, l = konta()) => { const k = loginKlucz(login); return (k && l.find(a => a.typ === typ && [a.email, a.tel].some(x => loginKlucz(x) === k))) || null; };
  // new or changed account: replaces the one with the same e-mail or phone
  const zapiszKonto = a => set('konta', [...konta().filter(x => !(x.typ === a.typ && [a.email, a.tel].some(v => v && konto(a.typ, v, [x])))), a]);
  // studio account -> "studioUser" (panel); client account -> "user", keeping her saved extras when the profile is hers
  function zaloguj(a) {
    if (a.typ === 'studio') return set('studioUser', { imie: a.imie, email: a.email || '', tel: a.tel || '', rola: a.rola });
    const u = get('user', {}) || {};
    set('user', [u.email, u.tel].some(x => konto('klientka', x, [a])) ? { ...u, zalogowana: true } : { imie: a.imie, email: a.email || '', tel: a.tel || '', zgody: a.zgody, zalogowana: true });
  }

  // referral invite (potwierdzenie, konto): system share sheet, else copy; the friend lands on the studio page with ?polec
  async function polec(studio, imie) {
    const url = new URL(`salon.html?s=${encodeURIComponent(studio)}&polec=1${imie ? '&od=' + encodeURIComponent(imie) : ''}`, location.href).href;
    const text = `Polecam ${studio}. Z tym linkiem masz 20 zł zniżki na pierwszą wizytę:`;
    try { if (navigator.share) { await navigator.share({ title: 'Zaproszenie do studia', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); toast('Skopiowano zaproszenie z linkiem'); } catch { toast('Link: ' + url); }
  }

  window.Mock = { lok, lokOf, get, set, reset, lookup, toast, addVisit, bindTexts, zl, dur, plural, zostalo,
    happyHours, setHappyHours, promoFor, happyToday, priceAfter, weekday, fotoKat, nipOk, polec,
    teraz, dzien, SKR, MIES, MIESD, dm, krotko, dlugo, zKrotko, odDzis, ustawDzis, testowa, iso, kody, setKody, sprawdzKod, karnety, sprzedane, karnetDla, cennikPoz, godziny, studio, moja, mojPodpis, odwH, zalProc, esc, fvNr, wizyt, kropki, zostaloZ, zostanie, sprzedaj, odlicz, odliczModal, cofnijOdlicz, KLIENTKI, klientki, reklamacje, setReklamacje, ankiety, ankietyWynik, magazyn, zalecenia,
    platnoscTryb, setPlatnoscTryb, zaliczka, PLATNOSC, platnoscBadge, zwrotPrzyOdwolaniu, zwrotTekst, stanowiska, stanSprzet, stanowiskoDla, stanowiskaWizyty, kolizjaStan, waznosc, waznePartie, zadania, setZadania, odKogo };
  // Studio styles (marketing.html adds them, salon.html shows those with on). foto: zdjecia/ path or a small data URL; link: creator link with the settings.
  const KOLEKCJA_SEED = [
    { id: 1, n: 'Mleczny róż, krótki migdał', foto: 'zdjecia/studio-nude.jpg', kat: 'Paznokcie', cena: 160, czas: '1 h 30', src: 'z kreatora', on: true, link: '' },
    { id: 2, n: 'Lawenda z drobinkami', foto: 'zdjecia/kat-paznokcie.jpg', kat: 'Paznokcie', cena: 190, czas: '1 h 45', src: 'z kreatora', on: true, link: '' },
    { id: 3, n: 'Nude z kropkami', foto: 'zdjecia/hh-manicure.jpg', kat: 'Paznokcie', cena: 180, czas: '1 h 45', src: 'zdjęcie z telefonu', on: true, link: '' },
    { id: 4, n: 'Naturalny beż, soft square', foto: 'zdjecia/dlon-1.jpg', kat: 'Paznokcie', cena: 150, czas: '1 h 15', src: 'z portfolio', on: false, link: '' }];
  window.Mock.kolekcja = () => get('kolekcja', null) || KOLEKCJA_SEED;
  // only a creator page of this site with its #settings (as "Kopiuj link" gives it), else the category's creator
  const KREATOR = { Paznokcie: 'paznokcie.html', Rzęsy: 'rzesy.html', Brwi: 'brwi.html', Fryzjer: 'fryzjer.html', Kosmetyka: 'kosmetyka.html' };
  window.Mock.kolekcjaLink = s => (String(s.link || '').match(/(paznokcie|rzesy|brwi|fryzjer|kosmetyka)\.html(#[\w%.*+=&-]*)?/) || [])[0] || KREATOR[s.kat] || 'paznokcie.html';
  console.assert(window.Mock.kolekcjaLink({ link: 'http://x/paznokcie.html#shape=almond&n_1=a"<b', kat: 'Rzęsy' }) === 'paznokcie.html#shape=almond&n_1=a'
    && window.Mock.kolekcjaLink({ link: 'javascript:alert(1)', kat: 'Rzęsy' }) === 'rzesy.html', 'kolekcjaLink');
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  Object.assign(window.Mock, { konta, konto, zapiszKonto, zaloguj }); // accounts (block before polec); a separate line keeps merges with the main export simple

  console.assert((() => {
    try { localStorage.setItem(PREFIX + '__t', '1'); } catch { return true; } // no storage: nothing to check
    set('__t', { a: { b: 2 } }); const ok = lookup('__t.a.b') === 2; localStorage.removeItem(PREFIX + '__t'); return ok;
  })(), 'mock.js store lookup');
  console.assert(fotoKat('Rzęsy') === 'zdjecia/k-rzesy.jpg' && fotoKat('Kosmetologia') === 'zdjecia/k-kosmetyka.jpg' && fotoKat(undefined) === 'zdjecia/k-paznokcie.jpg', 'mock.js fotoKat');
  console.assert(krotko(new Date(2026, 9, 20)) === 'wt 20.10' && dlugo(new Date(2026, 9, 20)) === 'Wtorek, 20 października'
    && odDzis(dzien(40)) === 40 && odDzis(zKrotko(krotko(dzien(40)))) === 40 && odDzis(zKrotko(krotko(dzien(-150)))) === -150 && zKrotko('bez daty') === null && PIN_OK.test('2026-10-20T18:30') && !PIN_OK.test('2026-10-20 18:30'), 'mock.js daty');
  console.assert((() => { const L = [{ kod: 'A10', typ: 'proc', wart: 10, od: '2026-01-01', do: '2026-12-31', kategorie: [], limit: 2, uzyto: 1, on: true },
      { kod: 'B5', typ: 'zl', wart: 50, od: '2026-01-01', do: '2026-12-31', kategorie: ['Rzęsy'], limit: 0, uzyto: 0, on: true }], d = '2026-06-01';
    return sprawdzKod(' a10 ', 'Paznokcie', 140, L, d).rabat === 14 && sprawdzKod('B5', 'Rzęsy', 40, L, d).rabat === 40 && !!sprawdzKod('B5', 'Brwi', 70, L, d).blad
      && !!sprawdzKod('A10', 'X', 100, L, '2027-01-01').blad && !!sprawdzKod('ZZ', 'X', 100, L, d).blad && sprawdzKod('', 'X', 1, L, d) === null; })(), 'mock.js sprawdzKod');
  console.assert((() => { const L = [{ k: 'Ola', tel: '600 100 200', us: 'Mani', t: 'pakiet', ile: 0, doIso: '2026-12-31' }, { k: 'Ola', tel: '+48600100200', us: 'Mani', t: 'pakiet', ile: 2, doIso: '2026-12-31' },
      { k: 'Ewa', tel: '', us: 'Mani', t: 'czasowy', ile: 0, doIso: '2026-01-31' }];
    return karnetDla('Mani', '600100200', '', L, '2026-06-01').i === 1 && karnetDla('Mani', '', 'Ewa', L, '2026-06-01') === null && karnetDla('Mani', '', 'Ewa', L, '2026-01-15').i === 2 && karnetDla('Inna', '600100200', '', L, '2026-06-01') === null; })(), 'mock.js karnetDla');
  console.assert((() => { const S = { ile: 3, wiz: 5 }, h = kropki(S); return wizyt(S) === 5 && (h.match(/#9E1F50/g) || []).length === 3 && (h.match(/#E4D9DE/g) || []).length === 2; })(), 'mock.js kropki');
  if (zalProc() === 30) console.assert(zaliczka(200) === 60 && zaliczka(145) === 44, 'mock.js zaliczka'); // the studio may set another %
  if (zalProc() === 30) console.assert((() => { const P = (status, rodzaj, kwota) => ({ cena: 200, platnosc: { status, rodzaj, kwota } });
    return zwrotPrzyOdwolaniu(P('opłacona', 'calosc', 200), true).platnosc.zwrot === 200 && zwrotPrzyOdwolaniu(P('opłacona', 'calosc', 200), false).platnosc.zwrot === 140
      && zwrotPrzyOdwolaniu(P('opłacona', 'zaliczka', 60), false).zwrot === undefined && zwrotPrzyOdwolaniu(P('opłacona', 'zaliczka', 60), true).platnosc.status === 'zwrócona'
      && zwrotPrzyOdwolaniu(P('nieudana', 'calosc', 200), true).zwrot === undefined && zwrotPrzyOdwolaniu({ zadatek: 42 }, true).zwrot === true && zwrotPrzyOdwolaniu({ zadatek: 42 }, false).zwrot === undefined; })(), 'mock.js zwrot przy odwołaniu');
  console.assert((() => { const L = [{ n: 'S1' }, { n: 'S2' }], Z = [{ od: 735, do: 795 }];
    return stanowiskoDla('Manicure hybrydowy', 'Paznokcie', {}, L) === '' && stanowiskoDla('X', 'Rzęsy', { X: 'S2' }, L) === 'S2' && stanowiskoDla('X', 'Rzęsy', { X: '' }, L) === '' && stanowiskoDla('X', 'Rzęsy', { X: 'Usunięte' }, L) === ''
      && stanowiskoDla('Rzęsy 1:1', 'Rzęsy', {}, STAN_SEED) === 'Stanowisko 2' && stanowiskoDla('Żel', 'Paznokcie', {}, STAN_SEED) === 'Stanowisko 1'
      && stanowiskaWizyty({ kategoria: 'Paznokcie', uslugi: [{ usluga: 'A', kategoria: 'Paznokcie' }, { usluga: 'B', kategoria: 'Brwi' }, { usluga: 'C', kategoria: 'Rzęsy' }] }, STAN_SEED).join() === 'Stanowisko 1,Stanowisko 2'
      && stanowiskaWizyty({ kategoria: 'Brwi', usluga: 'X', dojazd: { adres: 'a' } }, STAN_SEED).length === 0
      && kolizjaStan(Z, 780, 90, 10) === Z[0] && kolizjaStan(Z, 795, 30, 10) === Z[0] && kolizjaStan(Z, 805, 30, 10) === null && kolizjaStan(Z, 655, 70, 10) === null && kolizjaStan(Z, 660, 70, 10) === Z[0]; })(), 'mock.js kolizja stanowiska');
  if (zalProc() === 30) console.assert(zwrotTekst({ kwota: 140, rodzaj: 'calosc' }, 140, false) === 'studio zatrzyma 42 zł (30%), 98 zł wróci w ciągu 5 dni roboczych'
    && zwrotTekst({ kwota: 140, rodzaj: 'calosc' }, 140, true) === '140 zł wróci w ciągu 5 dni roboczych' && zwrotTekst({ kwota: 42, rodzaj: 'zaliczka' }, 140, false) === 'zaliczki 42 zł nie zwracamy'
    && zwrotTekst({ kwota: 42, rodzaj: 'zaliczka' }, 140, true) === '42 zł wróci w ciągu 5 dni roboczych', 'mock.js zwrotTekst');
  console.assert(waznosc({ wazne: '2026-10-12' }, '2026-10-21') === 'przeterminowane' && waznosc({ wazne: '2026-10-21' }, '2026-10-21') === 'kończy się' && waznosc({ wazne: '2026-11-20' }, '2026-10-21') === 'kończy się'
    && waznosc({ wazne: '2026-11-21' }, '2026-10-21') === '' && waznosc({}, '2026-10-21') === ''
    && waznePartie({ partie: [{ nr: 'A', wazne: '2026-10-01' }, { nr: 'B', wazne: '2027-01-01' }, { nr: 'C', wazne: '2027-01-01', utyl: true }] }, '2026-10-21').map(p => p.nr).join() === 'B', 'mock.js ważność partii');
  console.assert(nipOk('123-456-32-18') && !nipOk('1234563217') && !nipOk('12345') && !nipOk(''), 'mock.js nipOk');
  console.assert(konto('klientka', ' KASIA@Example.com ', KONTA_SEED)?.imie === 'Kasia' && konto('klientka', '+48 600 100 200', KONTA_SEED)?.imie === 'Kasia'
    && konto('studio', 'kasia@example.com', KONTA_SEED) === null && konto('klientka', '', KONTA_SEED) === null && konto('klientka', 'x@example.com', [{ typ: 'klientka', tel: '600100200' }]) === null, 'mock.js konto');
  console.assert(zl(-15) === '−15 zł' && dur(105) === '1 h 45 min' && dur(60) === '1 h' && plural(1, ['a', 'b', 'c']) === '1 a' && zostalo(1) === 'została 1 wizyta' && zostalo(3) === 'zostały 3 wizyty' && zostalo(12) === 'zostało 12 wizyt' && zostalo(0) === 'zostało 0 wizyt'
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
