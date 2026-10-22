// Narzędzia makiety: test date and time, ready-made scenarios, panel role, add-ons and a data reset.
// Loaded only when someone clicks "Narzędzia" in the mock bar (mock.js). Everything lives in this browser's localStorage.
const $ = s => document.querySelector(s);
const p2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const naDzien = n => { let d = Mock.dzien(n); while (d.getDay() === 0) d = Mock.dzien(++n); return d; }; // n days ahead, skipping Sunday (closed)
const hm = m => `${Math.floor(m / 60)}:${p2(m % 60)}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); // names from registration forms

// roles: the same keys as ROLES in panel-shell.js (the panel hides menu items by role)
const ROLE = Mock.get('role', null)?.map(r => [r.k, r.n]) || [['właścicielka', 'Właścicielka'], ['menedzerka', 'Menedżerka'], ['recepcja', 'Recepcja'], ['stylistka-plus', 'Stylistka z dostępem rozszerzonym'], ['stylistka', 'Stylistka podstawowa']]; // edited roles from zespol.html, else the defaults

// a visit as termin.html saves it
function wizyta(d, od, min, extra = {}) {
  return { id: Date.now() + Math.floor(Math.random() * 1000), kategoria: 'Paznokcie', studio: 'Studio Malwa', stylistka: 'Magda', klientka: 'Kasia', kontakt: { imie: 'Kasia', tel: '600100200' },
    osoby: 1, dlaKogo: null, dojazd: null, status: 'nadchodząca', usluga: 'Manicure hybrydowy', opis: 'Manicure hybrydowy', cena: 140, cenaMin: 140, cenaMax: 140,
    czas: min, czasTekst: Mock.dur(min), dzien: Mock.krotko(d), godzina: hm(od), koniec: hm(od + min), ...extra };
}
const doBooking = v => ({ ...v, visitId: v.id }); // potwierdzenie.html reads the booking of the visit

// each scenario sets only what it needs and opens the page where it shows
const SCEN = [
  ['Wizyta jutro, do potwierdzenia', 'W „Moich wizytach” pojawia się „Potwierdzam, będę” (wizyty do 48 h).', () => {
    const v = wizyta(naDzien(1), 11 * 60 + 15, 75); Mock.set('visits', [v]); Mock.set('booking', doBooking(v)); return 'wizyty.html';
  }],
  ['Wizyta za 2 godziny, z zaliczką', 'Data testowa: dziś 10:00. Odwołanie jest już po terminie 24 h, więc zaliczka przepada.', () => {
    Mock.ustawDzis(`${iso(Mock.dzien(0))}T10:00`);
    const v = wizyta(Mock.dzien(0), 12 * 60, 75, { zadatek: 42 }); Mock.set('visits', [v]); Mock.set('booking', doBooking(v)); return 'potwierdzenie.html';
  }],
  ['Wieczór: dziś nie ma już miejsc', 'Data testowa: dziś 18:30. Termin od razu proponuje następny dzień.', () => {
    Mock.ustawDzis(`${iso(Mock.dzien(0))}T18:30`); return 'termin.html';
  }],
  ['Niedziela: studio zamknięte', 'Data testowa: najbliższa niedziela. Salon pokazuje „Zamknięte”, termin zaczyna się od poniedziałku.', () => {
    let n = 0; while (Mock.dzien(n).getDay() !== 0) n++; Mock.ustawDzis(iso(Mock.dzien(n))); return 'salon.html';
  }],
  ['Klientka zalogowana', 'Profil z polecaniem, bliskimi i powiadomieniami.', () => {
    Mock.set('user', { imie: 'Kasia', tel: '600100200', email: 'kasia@example.com', zalogowana: true, zgody: { regulamin: true, marketing: false } }); return 'konto.html';
  }],
  ['Nowa klientka z polecenia', 'Bez konta, z linku od koleżanki: baner 20 zł zniżki w salonie.', () => {
    Mock.set('user', null); Mock.set('polecenie', null); return 'salon.html?s=Studio%20Malwa&polec=1&od=Ola';
  }],
  ['Kod rabatowy z kampanii', 'Rezerwacja z linku z kodem JESIEN20: termin od razu liczy −20%.', () => {
    Mock.set('koszyk', null); Mock.set('booking', { kategoria: 'Paznokcie', usluga: 'Manicure hybrydowy', opis: 'Manicure hybrydowy', cena: 140, cenaMin: 140, cenaMax: 140, czas: 75, czasTekst: '1 h 15 min', studio: 'Studio Malwa' }); return 'termin.html?kod=JESIEN20';
  }],
  ['Klientka z karnetem', 'Kasia ma „Pakiet 5× hybryda” (zostały 3 wizyty): przy rezerwacji widzi „Rozlicz z karnetu”.', () => {
    const o = Mock.karnety()[0], end = Mock.dzien(150);
    Mock.set('user', { imie: 'Kasia', tel: '600100200', zalogowana: true });
    Mock.set('karnety.sprzedane', [{ k: 'Kasia', tel: '600100200', n: o.n, t: o.t, us: o.us, cena: o.cena, ile: 3, data: Mock.dzien(-30).toLocaleDateString('pl-PL'), do: end.toLocaleDateString('pl-PL'), doIso: Mock.iso(end), online: true }]);
    Mock.set('koszyk', null); Mock.set('booking', { kategoria: 'Paznokcie', usluga: 'Manicure hybrydowy', opis: 'Manicure hybrydowy', cena: 140, cenaMin: 140, cenaMax: 140, czas: 75, czasTekst: '1 h 15 min', studio: 'Studio Malwa' }); return 'termin.html';
  }],
  ['Reklamacja po wizycie', 'Odbyta wizyta Kasi w historii: „Zgłoś reklamację”, a w panelu (Opinie) studio na nią odpowiada.', () => {
    Mock.set('user', { imie: 'Kasia', tel: '600100200', zalogowana: true });
    Mock.set('visits', [wizyta(Mock.dzien(-4), 11 * 60 + 15, 75, { status: 'odbyta' })]); Mock.setReklamacje(null); return 'wizyty.html';
  }],
  ['Odwołanie na czas: zwrot zaliczki', 'Wizyta za 3 dni z zaliczką 42 zł. Odwołaj ją w „Moich wizytach”: w historii pojawi się „Zwrot zaliczki: w drodze”.', () => {
    Mock.set('user', { imie: 'Kasia', tel: '600100200', zalogowana: true });
    Mock.set('visits', [wizyta(naDzien(3), 10 * 60, 75, { zadatek: 42 })]); return 'wizyty.html';
  }],
  ['Studio z dwiema lokalizacjami', 'Panel ustawiony na drugą lokalizację (przełącznik w nagłówku), lista lokalizacji w profilu studia.', () => {
    Mock.set('lokalizacje', null); Mock.set('lokalizacja', 1); Mock.set('studioUser', null); return 'profil-studia.html';
  }],
  ['Studio: dziś dwie rezerwacje online', 'W kalendarzu: Ola z fakturą (potwierdziła) i Ewa z polecenia (czeka na potwierdzenie).', () => {
    Mock.set('visits', [
      wizyta(Mock.dzien(0), 17 * 60, 60, { klientka: 'Ola', kontakt: { imie: 'Ola', tel: '600200300' }, stylistka: 'Ewelina', potwierdzona: true, faktura: { nip: '1234563218', firma: 'Ola Beauty' } }),
      wizyta(Mock.dzien(0), 13 * 60 + 15, 15, { klientka: 'Ewa', kontakt: { imie: 'Ewa', tel: '600300400' }, usluga: 'Zdjęcie hybrydy', opis: 'Zdjęcie hybrydy', cena: 20, cenaMin: 20, cenaMax: 20, polecenie: { studio: 'Studio Malwa', od: 'Kasia' } })
    ]); Mock.set('lokalizacja', 0); return 'panel.html'; // the visits belong to the first location
  }],
  // Etap A
  ['Płatność nieudana', 'Wizyta za 2 dni, studio bierze całość z góry, a płatność się nie udała. W „Moich wizytach” ramka z „Ponów płatność”.', () => {
    Mock.setPlatnoscTryb('calosc'); Mock.set('user', { imie: 'Kasia', tel: '600100200', zalogowana: true });
    const t = Mock.teraz(), za30 = new Date(t.getTime() + 30 * 60000);
    const v = wizyta(naDzien(2), 11 * 60 + 15, 75, { platnosc: { status: 'nieudana', kwota: 140, rodzaj: 'calosc', metoda: 'BLIK', do: hm(za30.getHours() * 60 + za30.getMinutes()) } });
    Mock.set('visits', [v]); Mock.set('booking', doBooking(v)); return 'wizyty.html';
  }],
  ['Przeterminowana partia', 'Magazyn z partiami: „Top bez przemywania” jest po terminie (czerwony komunikat), dwie partie kończą się w ciągu 30 dni. W panelu przy wizycie jej nie wybierzesz.', () => {
    Mock.set('magazyn', null); Mock.set('studioUser', null); return 'magazyn.html';
  }],
  ['Stanowisko zajęte', 'Kasia ma na pojutrze 11:15 hennę brwi dla siostry, na leżance (Stanowisko 2). Przy rezerwacji rzęs tego dnia godzina 11:15 znika.', () => {
    const dn = []; for (let n = 0; dn.length < 2; n++) if (Mock.dzien(n).getDay() !== 0) dn.push(n); // the second day termin.html offers
    Mock.set('cennik.stan', null); Mock.set('zespol.stan', null); Mock.set('user', { imie: 'Kasia', tel: '600100200', zalogowana: true });
    Mock.set('visits', [wizyta(Mock.dzien(dn[1]), 11 * 60 + 15, 60, { kategoria: 'Brwi', usluga: 'Henna + regulacja', opis: 'Henna + regulacja brwi', cena: 70, cenaMin: 70, cenaMax: 70, stylistka: 'Ewelina', dlaKogo: { imie: 'Ola', tel: '' }, klientka: 'Ola' })]);
    Mock.set('koszyk', null); Mock.set('booking', { kategoria: 'Rzęsy', usluga: 'Uzupełnienie 1:1', opis: 'Uzupełnienie rzęs 1:1', cena: 150, cenaMin: 150, cenaMax: 150, czas: 90, czasTekst: '1 h 30 min', studio: 'Studio Malwa', kat: 'rzesy' });
    return 'termin.html';
  }],
  ['Zadania zespołu', 'Zakładka „Zadania” w Zespole: ogłoszenie od właścicielki, trzy zadania do zrobienia i jedno zrobione.', () => {
    Mock.set('zadania', null); Mock.set('studioUser', null); return 'zespol.html#zadania';
  }]
];

const CSS = `
#narz{width:min(560px,calc(100% - 24px));max-height:calc(100vh - 32px);overflow:auto}
#narz h2{margin:0;font:700 20px 'Bricolage Grotesque',sans-serif}
#narz h3{margin:0;font-size:15px}
#narz section{display:flex;flex-direction:column;gap:10px;padding:14px 0;border-top:1px solid #F0E8EC}
#narz .row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}
#narz label.f{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#625860}
#narz input[type=date],#narz input[type=time],#narz select{min-height:44px;padding:0 10px;border-radius:10px;border:1px solid #C9B6BF;font:inherit;color:#1E1A1D;background:#fff}
#narz .b{min-height:44px;padding:0 14px;border-radius:10px;border:1px solid #E4D9DE;background:#fff;color:#1E1A1D;font:inherit;cursor:pointer}
#narz .b:hover{background:#FAF6F8}
#narz .b:disabled{color:#A99BA2;background:#FAF6F8;cursor:default}
#narz .b.pri{background:#9E1F50;border-color:#9E1F50;color:#fff;font-weight:700}
#narz .b.dng{color:#A3262A;border-color:#A3262A}
#narz .sc{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;width:100%;padding:10px 12px;min-height:56px}
#narz .sc small{color:#625860;font-size:12px;line-height:1.4}
#narz .chk{display:flex;gap:10px;align-items:center;min-height:44px}
#narz .chk input{width:20px;height:20px;accent-color:#9E1F50;flex:none}
#narz .mut{color:#625860;font-size:12px;line-height:1.45;margin:0}
#narz .stan{padding:8px 12px;border-radius:10px;background:#FAF6F8;font-size:14px}
#narz .kt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border:1px solid #E4D9DE;border-radius:10px}
#narz .kt span{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:anywhere}
#narz .kt small{color:#625860;font-size:12px;line-height:1.45}
#narz .kt code{font-size:12px;color:#1E1A1D;background:#FAF6F8;padding:1px 4px;border-radius:4px}`;

// a scenario opened from a test link (?scen=N): prepares the data and returns the page to open
export function scenariusz(i) { const s = SCEN[i]; return s ? s[2]() : null; }
export const SCENARIUSZE = SCEN.map(([n, o]) => [n, o]);

export function otworz() {
  let d = $('#narz');
  if (!d) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
    d = document.createElement('dialog'); d.id = 'narz'; d.setAttribute('aria-labelledby', 'narz-t'); document.body.append(d);
  }
  const t = Mock.teraz(), test = Mock.testowa(), user = Mock.get('studioUser', null) || {}, dod = Mock.get('dodatki', {}) || {};
  const hhOn = Mock.happyHours().some(h => h.on), konta = Mock.konta();
  d.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 id="narz-t">Narzędzia makiety</h2><button type="button" class="b" data-close aria-label="Zamknij">✕</button></div>
    <p class="mut">Do testów i pokazów. Zmiany działają tylko w tej przeglądarce i nie trafiają do nikogo.</p>
    <section aria-labelledby="n-data">
      <h3 id="n-data">Data i godzina</h3>
      <span class="stan">${test ? `Data testowa: <b>${Mock.dlugo(t)}, ${t.getHours()}:${p2(t.getMinutes())}</b>` : `Prawdziwa data z urządzenia: <b>${Mock.dlugo(t)}, ${t.getHours()}:${p2(t.getMinutes())}</b>`}</span>
      <div class="row">
        <label class="f">Dzień<input type="date" id="n-dzien" value="${iso(t)}"></label>
        <label class="f">Godzina (puste = prawdziwa)<input type="time" id="n-godz" step="900" value="${test && test.length > 10 ? test.slice(11) : ''}"></label>
        <button type="button" class="b pri" id="n-ustaw">Ustaw</button>
      </div>
      <div class="row" role="group" aria-label="Szybki wybór">
        <button type="button" class="b" data-skok="1">Jutro</button>
        <button type="button" class="b" data-skok="7">Za tydzień</button>
        <button type="button" class="b" data-skok="nd">Niedziela</button>
        <button type="button" class="b" data-skok="wiecz">Dziś 18:30</button>
        <button type="button" class="b" id="n-teraz"${test ? '' : ' disabled'}>Wróć do prawdziwej daty</button>
      </div>
    </section>
    <section aria-labelledby="n-konta">
      <h3 id="n-konta">Konta testowe</h3>
      <p class="mut">Do logowania klientki (Zaloguj się) i studia (panel). Konta z rejestracji też tu trafiają.</p>
      ${konta.map((a, i) => `<div class="kt"><span><b>${esc(a.imie)}</b><small>${a.typ === 'studio' ? `Panel studia · ${esc((ROLE.find(r => r[0] === a.rola) || [, a.rola])[1])}` : 'Klientka'}</small>
        <small>Login: ${[a.email, a.tel].filter(Boolean).map(x => `<code>${esc(x)}</code>`).join(' lub ')} · Hasło: ${a.haslo ? (a.przyklad ? `<code>${esc(a.haslo)}</code>` : 'ustawione przy rejestracji (nie pokazujemy)') : 'brak, logowanie kodem SMS'}</small></span>
        <button type="button" class="b" data-kt="${i}">Zaloguj jako</button></div>`).join('')}
    </section>
    <section aria-labelledby="n-scen">
      <h3 id="n-scen">Gotowe scenariusze</h3>
      <p class="mut">Każdy ustawia tylko potrzebne dane i otwiera stronę, na której to widać.</p>
      ${SCEN.map(([n, o], i) => `<button type="button" class="b sc" data-sc="${i}"><b>${n}</b><small>${o}</small></button>`).join('')}
    </section>
    <section aria-labelledby="n-rola">
      <h3 id="n-rola">Rola w panelu studia</h3>
      <div class="row"><label class="f" style="flex:1">Zalogowana jako<select id="n-r">${ROLE.map(([k, n]) => `<option value="${k}"${(user.rola || 'właścicielka') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label><button type="button" class="b" id="n-r-ok">Zmień i otwórz panel</button></div>
      <p class="mut">Menu panelu chowa strony, których dana rola nie widzi.</p>
    </section>
    <section aria-labelledby="n-dod">
      <h3 id="n-dod">Dodatki i ustawienia studia</h3>
      <label class="chk"><input type="checkbox" id="n-podp"${dod.podpisy ? ' checked' : ''}>Podpisy elektroniczne (zgody, podpis na tablecie i na pliku)</label>
      <label class="chk"><input type="checkbox" id="n-zal"${Mock.platnoscTryb() !== 'brak' ? ' checked' : ''}>Studio wymaga zaliczki przy rezerwacji</label>
      <label class="chk"><input type="checkbox" id="n-hh"${hhOn ? ' checked' : ''}>Happy hours włączone</label>
    </section>
    <section aria-labelledby="n-reset">
      <h3 id="n-reset">Dane makiety</h3>
      <p class="mut">Usuwa wizyty, konto klientki, konta z rejestracji, koszyk, podpisy, wiadomości i ustawienia panelu. Data testowa też wraca do prawdziwej.</p>
      <button type="button" class="b dng" id="n-wyczysc" style="align-self:flex-start">Wyczyść dane makiety</button>
    </section>
    <section aria-labelledby="n-uw">
      <h3 id="n-uw">Uwagi z testów</h3>
      <p class="mut">Zapisane na tym urządzeniu: <b id="n-uw-n">${(Mock.get('zgloszenia', []) || []).length}</b>. Zostają po wyczyszczeniu danych makiety.</p>
      <span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="b" id="n-uw-pobierz">Pobierz (JSON)</button><button type="button" class="b dng" id="n-uw-usun">Usuń uwagi</button></span>
    </section>`;

  const przeladuj = (msg, url) => { Mock.toast(msg); setTimeout(() => (url ? (location.href = url) : location.reload()), 500); };
  d.querySelector('#n-ustaw').addEventListener('click', () => {
    const dz = d.querySelector('#n-dzien').value, g = d.querySelector('#n-godz').value;
    if (!dz) return Mock.toast('Wybierz dzień');
    Mock.ustawDzis(g ? `${dz}T${g}` : dz); przeladuj('Ustawiono datę testową');
  });
  d.querySelectorAll('[data-skok]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.skok;
    if (k === 'wiecz') Mock.ustawDzis(`${iso(Mock.dzien(0))}T18:30`);
    else if (k === 'nd') { let n = 1; while (Mock.dzien(n).getDay() !== 0) n++; Mock.ustawDzis(iso(Mock.dzien(n))); }
    else Mock.ustawDzis(iso(Mock.dzien(+k)));
    przeladuj('Ustawiono datę testową');
  }));
  d.querySelector('#n-teraz').addEventListener('click', () => { Mock.ustawDzis(null); przeladuj('Wróciła prawdziwa data'); });
  d.querySelectorAll('[data-sc]').forEach(b => b.addEventListener('click', () => { const [n, , f] = SCEN[+b.dataset.sc]; przeladuj('Scenariusz: ' + n, f()); }));
  d.querySelectorAll('[data-kt]').forEach(b => b.addEventListener('click', () => {
    const a = konta[+b.dataset.kt]; Mock.zaloguj(a); przeladuj('Zalogowano: ' + a.imie, a.typ === 'studio' ? 'panel.html' : 'konto.html');
  }));
  d.querySelector('#n-r-ok').addEventListener('click', () => {
    const k = d.querySelector('#n-r').value, n = ROLE.find(r => r[0] === k)[1];
    Mock.set('studioUser', { imie: `[${n}]`, email: '', rola: k }); przeladuj('Rola: ' + n, 'panel.html');
  });
  d.querySelector('#n-podp').addEventListener('change', e => { Mock.set('dodatki', { ...(Mock.get('dodatki', {}) || {}), podpisy: e.target.checked }); przeladuj(e.target.checked ? 'Podpisy włączone' : 'Podpisy wyłączone'); });
  d.querySelector('#n-zal').addEventListener('change', e => { Mock.setPlatnoscTryb(e.target.checked ? 'zaliczka' : 'brak'); Mock.toast(e.target.checked ? 'Studio wymaga zaliczki' : 'Bez zaliczki'); });
  d.querySelector('#n-hh').addEventListener('change', e => { Mock.setHappyHours(Mock.happyHours().map(h => ({ ...h, on: e.target.checked }))); przeladuj(e.target.checked ? 'Happy hours włączone' : 'Happy hours wyłączone'); });
  const w = d.querySelector('#n-wyczysc');
  w.addEventListener('click', () => { // two clicks: deleting everything needs a second look
    if (!w.dataset.pewno) { w.dataset.pewno = '1'; w.textContent = 'Na pewno? Kliknij jeszcze raz'; return; }
    Mock.reset(); przeladuj('Dane makiety wyczyszczone', 'start.html');
  });
  d.querySelector('#n-uw-pobierz').addEventListener('click', () => {
    const l = Mock.get('zgloszenia', []) || [];
    if (!l.length) return Mock.toast('Nie ma zapisanych uwag');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(l, null, 2)], { type: 'application/json' })), download: `uwagi-${Mock.iso(Mock.teraz())}.json` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const u = d.querySelector('#n-uw-usun');
  u.addEventListener('click', () => { // two clicks, like the data reset
    if (!u.dataset.pewno) { u.dataset.pewno = '1'; u.textContent = 'Na pewno? Kliknij jeszcze raz'; return; }
    Mock.set('zgloszenia', []); d.querySelector('#n-uw-n').textContent = '0'; u.textContent = 'Usuń uwagi'; delete u.dataset.pewno; Mock.toast('Usunięto uwagi');
  });
  if (!d.open) d.showModal();
}
