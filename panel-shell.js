// Panel studia: wspólne menu boczne, dzwonek powiadomień, klasy .p-* i okno PS.modal. Plik agenta B (nie jest częścią mock.js).
// Strona wstawia <nav id="panel-nav"></nav> (opcjonalnie data-active="panel.html") i ładuje mock.js, a potem ten plik (oba defer).
(function () {
  const NAV = [
    ['Dzień pracy', [['Kalendarz', 'panel.html'], ['Wyceny', 'wyceny.html', 'badge'], ['Wiadomości', 'wiadomosci.html'], ['Klientki', 'klientki.html']]],
    ['Sprzedaż', [['Kasa', 'kasa.html'], ['Karnety i pakiety', 'karnety.html'], ['Promocje', 'promocje.html'], ['Marketing', 'marketing.html']]],
    ['Studio', [['Cennik i kreator', 'cennik.html'], ['Zespół i grafik', 'zespol.html'], ['Magazyn', 'magazyn.html'], ['Profil studia', 'profil-studia.html'], ['Formularze i zgody', 'formularze.html'], ['Opinie', 'opinie-studio.html']]],
    ['Zarządzanie', [['Raporty', 'raporty.html'], ['Ustawienia', 'ustawienia.html']]]
  ];
  // Prośby o wycenę ze stałych przykładów; wyceny.html i panel.html czytają to samo.
  const QUOTES = Mock.lok() === 1 ? [ // the hair location gets hair requests; a location added in the profile starts empty
    { id: 'm1', klientka: 'Zosia R.', opis: 'Balejaż jak na zdjęciu, włosy do łopatek', zrodlo: 'inspiracja z Pinteresta', kolor: '#B08A5B', foto: 'zdjecia/wlosy-3-mini.jpg' }
  ] : Mock.lok() ? [] : [
    { id: 'q1', klientka: 'Felicja R.', opis: 'Takie jak na zdjęciu, ale krótsze', zrodlo: 'inspiracja z Instagrama', kolor: '#C98C8C', foto: 'zdjecia/dlon-4-mini.jpg' },
    { id: 'q2', klientka: 'Hania Z.', opis: 'Francuz z drobnymi cyrkoniami, długość L', zrodlo: 'zdjęcie ze strony studia', kolor: '#3E2A4A', foto: 'zdjecia/styl-micro-french.jpg' }
  ];

  const CSS = `
.p-btn{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #E4D9DE;background:#fff;color:#1E1A1D;font:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;box-sizing:border-box}
.p-btn:hover{background:#FAF6F8;color:#1E1A1D}
.p-btn.pri{background:#9E1F50;border-color:#9E1F50;color:#fff;font-weight:700}.p-btn.pri:hover{background:#7A173D;color:#fff}
.p-btn.dark{background:#fff;border-color:#9E1F50;color:#9E1F50;font-weight:700}.p-btn.dark:hover{background:#F6EDF1;color:#9E1F50} /* secondary action: burgundy is the only action colour */
.p-btn.dng{color:#A3262A;border-color:#A3262A}
.p-btn.dash{border-style:dashed;border-color:#A99BA2}
.p-btn.sm{min-height:40px;padding:0 12px}
.p-btn:focus-visible,.p-in:focus-visible,.pn-a:focus-visible,.p-pill:focus-visible{outline:2px solid #9E1F50;outline-offset:2px}
.p-card{background:#fff;border:1px solid #F0E8EC;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;min-width:0}
.p-card>h2,.p-h2{margin:0;font-size:16px;font-weight:700}
.p-h1{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700}
.p-top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.p-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.p-in{min-height:44px;padding:0 12px;border-radius:10px;border:1px solid #C9B6BF;font:inherit;background:#fff;color:#1E1A1D;box-sizing:border-box;max-width:100%;min-width:0}
textarea.p-in{padding:10px 12px;resize:vertical}
.p-in.s{min-height:38px;padding:0 8px;border-radius:8px}
.p-lab{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#625860;max-width:100%;min-width:0}
.p-lab .p-in{color:#1E1A1D}
.p-chk{display:flex;gap:10px;align-items:center;min-height:32px}.p-chk input{width:20px;height:20px;flex:none;accent-color:#9E1F50}
.p-chip{padding:6px 10px;border-radius:999px;background:#F6EDF1;font-size:13px;display:inline-block}
.p-badge{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#F6EDF1;color:#9E1F50;display:inline-block;white-space:nowrap}
.p-badge.ok{background:#E6F2EC;color:#1F6B47}.p-badge.warn{background:#FFF1E0;color:#8A3B12}.p-badge.blue{background:#EAF0F7;color:#2F5A86}
.p-row{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px;border-radius:12px;background:#FAF6F8}
.p-sep{height:1px;background:#F0E8EC;border:0;margin:0}
.p-mut{color:#625860;font-size:12px;line-height:1.45}
.p-pills{display:flex;gap:6px;flex-wrap:wrap}
.p-pill{min-height:40px;padding:0 16px;border-radius:999px;border:1px solid #E4D9DE;background:#fff;color:#1E1A1D;font:inherit;cursor:pointer}
.p-pill[aria-pressed="true"],.p-pill[aria-selected="true"]{background:#fff;border-color:#9E1F50;color:#9E1F50;font-weight:700;box-shadow:inset 0 0 0 1px #9E1F50}
.p-tw{overflow-x:auto}
.p-tbl{width:100%;border-collapse:collapse;text-align:left;min-width:520px}
.p-tbl th{padding:8px 6px;font-weight:500;color:#625860;font-size:12px}
.p-tbl td{padding:8px 6px;border-top:1px solid #F0E8EC}
.p-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px;align-items:start}
.p-stat{background:#fff;border:1px solid #F0E8EC;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:4px}
.p-stat b{font-family:'Bricolage Grotesque',sans-serif;font-size:26px}
.p-ava{width:40px;height:40px;border-radius:50%;flex:none;background:#E4D9DE}
.p-box{padding:10px 12px;border-radius:10px;background:#FAF6F8;display:flex;justify-content:space-between;gap:10px;align-items:center}
.p-banner{padding:12px 14px;border-radius:12px;background:#E6F2EC;color:#1F6B47;font-weight:700}
.p-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.pn{flex:1 1 220px;max-width:260px;box-sizing:border-box;padding:24px 16px;background:#fff;border-right:1px solid #F0E8EC;display:flex;flex-direction:column;gap:2px}
.pn-g{margin-top:14px;padding:16px 12px 6px;border-top:1px solid #EADDE3;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9E1F50}
.pn-a{min-height:44px;padding:0 12px;border-radius:10px;color:#1E1A1D;text-decoration:none;display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box}
.pn-a:hover{background:#FAF6F8;color:#1E1A1D}
.pn-a[aria-current]{background:#F6EDF1;font-weight:700}
.pn-n{min-width:22px;height:22px;border-radius:11px;background:#9E1F50;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
.pn-bar{display:flex;justify-content:flex-end;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:-8px;width:100%;box-sizing:border-box}
@media (max-width:639px){.pn-lok{flex:1 1 100%;margin:0 !important}.pn-lok select{flex:1 1 auto;max-width:none !important}} /* phone: location switch on its own row, label kept */ /* full row also in pages whose main wraps cards side by side (klientki) */
.pn-user{position:relative}.pn-user summary{list-style:none;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid #E4D9DE;background:#fff;display:flex;flex-direction:column;justify-content:center;cursor:pointer;line-height:1.2}
.pn-user summary::-webkit-details-marker{display:none}.pn-user summary small{color:#625860;font-size:12px}
.pn-user summary:focus-visible{outline:2px solid #9E1F50;outline-offset:2px}
.pn-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:20;min-width:180px;padding:6px;border-radius:12px;border:1px solid #E4D9DE;background:#fff;box-shadow:0 8px 24px rgba(30,26,29,.12);display:flex;flex-direction:column}
.pn-menu button{min-height:44px;padding:0 12px;border:0;border-radius:8px;background:none;font:inherit;text-align:left;cursor:pointer;color:#1E1A1D}.pn-menu button:hover{background:#FAF6F8}
.pn-bell{position:relative;width:44px;height:44px;border-radius:12px;border:1px solid #E4D9DE;background:#fff;color:#1E1A1D;display:flex;align-items:center;justify-content:center;cursor:pointer}
.pn-bell i{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:#9E1F50;color:#fff;font:700 12px 'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center}
.pn-skip{position:absolute;left:8px;top:-80px;z-index:1001;padding:12px 16px;border-radius:10px;background:#1E1A1D;color:#fff;text-decoration:none}.pn-skip:focus{top:8px;color:#fff}
/* dotyk: !important, bo starsze strony mają min-height w stylu inline */
@media (max-width:1023px){main button,aside button,dialog button,main select,dialog select,main input:not([type=checkbox]):not([type=radio]),dialog input:not([type=checkbox]):not([type=radio]),main a.p-btn,main a[style*=min-height]{min-height:44px !important}main button[aria-label]{min-width:44px !important}}
.pn-ntf{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:10px;background:#FAF6F8;text-decoration:none;color:#1E1A1D}
.pn-ntf.new{background:#F6EDF1}
@media (max-width:1023px){.pn{max-width:none;flex:1 1 100%;flex-direction:row;overflow-x:auto;padding:10px 12px;border-right:0;border-bottom:1px solid #F0E8EC}.pn-g{flex:none;align-self:center;width:1px;height:28px;padding:0;margin:0 8px;border:0;background:#D9C9D0;font-size:0;overflow:hidden}.pn-logo+.pn-g{display:none}.pn-a{white-space:nowrap;flex:none}.pn-logo{display:none !important}}
dialog form h2{font-family:'Bricolage Grotesque',sans-serif}`;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const file = () => location.pathname.split('/').pop() || 'paznokcie.html';

  // Okno z formularzem. o: {title, body (html), ok, cls, toast (tekst albo fn(form)), onOk(form, dlg) -> false zostawia okno, onOpen(form, dlg), noOk}
  // Change log (ustawienia.html shows it): moved or rejected visits, price changes, logged-out devices. { t: ISO time, kto, co }
  const LOG_SEED = () => { const t = Mock.teraz(), m = n => new Date(t - n * 60000).toISOString();
    return [{ t: m(35), kto: 'Magda', co: 'przeniosła wizytę: Basia W., 10:30 → 11:15' }, { t: m(150), kto: 'Joanna', co: 'zmieniła cenę: Manicure hybrydowy, 130 → 140 zł' }, { t: m(26 * 60), kto: 'Recepcja', co: 'odrzuciła rezerwację: Ela K., prośba klientki, zaliczka zwrócona' }]; };
  const dziennik = () => Mock.get('dziennik', null) || LOG_SEED();
  const log = co => Mock.set('dziennik', [{ t: Mock.teraz().toISOString(), kto: ((Mock.get('studioUser', {}) || {}).imie || 'Joanna').split(' ')[0], co }, ...dziennik()].slice(0, 200));
  // "Chrome · Windows": a rough name of this browser for the device list and the SMS step
  const urzadzenie = (ua = navigator.userAgent) => [/Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Przeglądarka',
    /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'komputer'].join(' · ');
  const kiedy = x => { const d = new Date(x), o = Mock.odDzis(d), g = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    return (o === 0 ? 'dziś' : o === -1 ? 'wczoraj' : Mock.dm(d)) + ' ' + g; };

  function modal(o) {
    const d = document.createElement('dialog');
    d.setAttribute('aria-label', o.title);
    d.innerHTML = `<form style="display:flex;flex-direction:column;gap:12px"><h2 style="margin:0;font-size:20px">${esc(o.title)}</h2>${o.body || ''}<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:4px"><button type="button" class="p-btn" data-close>${o.noOk ? 'Zamknij' : 'Anuluj'}</button>${o.noOk ? '' : `<button class="p-btn ${o.cls || 'pri'}">${esc(o.ok || 'Zapisz')}</button>`}</div></form>`;
    document.body.append(d);
    const f = d.querySelector('form');
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (o.onOk && o.onOk(f, d) === false) return;
      d.close();
      const t = typeof o.toast === 'function' ? o.toast(f) : o.toast;
      if (t) Mock.toast(t);
    });
    d.addEventListener('close', () => d.remove());
    Mock.oko(d);
    d.showModal();
    if (o.onOpen) o.onOpen(f, d);
    return d;
  }


  // Usługi do ręcznego dodawania wizyt: ceny paznokci z pricing.json, reszta przykładowa. Druga lokalizacja (Mokotów) to fryzjer.
  const SVC = Mock.lok() === 1 ? [['Strzyżenie damskie (cena przykładowa)', 'Włosy', 120, 60], ['Modelowanie (cena przykładowa)', 'Włosy', 90, 60], ['Koloryzacja (cena przykładowa)', 'Włosy', 320, 150],
    ['Balejaż (cena przykładowa)', 'Włosy', 450, 180], ['Keratynowe prostowanie (cena przykładowa)', 'Włosy', 380, 120]]
    : [['Manicure hybrydowy', 'Paznokcie', 140, 75], ['Żel na naturalnej płytce', 'Paznokcie', 170, 105], ['Przedłużanie (tipsy / szablon)', 'Paznokcie', 200, 150], ['Uzupełnienie żelu', 'Paznokcie', 180, 120],
    ['Rzęsy 1:1 (cena przykładowa)', 'Rzęsy', 150, 90], ['Brwi: henna + regulacja (cena przykładowa)', 'Brwi', 70, 45]];
  SVC.forEach(s => { const b = Mock.cennikPoz(s[1], s[0]); if (b) { s[2] = b[1]; s[3] = b[2]; } }); // prices saved in Cennik
  const SLOTS = []; for (let m = 540; m <= 1050; m += 15) SLOTS.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
  // "+ Wizyta": o = {days: [[etykieta, 'wt 20.10'], ...] | null, dzien, godz, stylistka, done()}; without days: today
  function visitModal(o = {}) {
    const dz = o.dzien || Mock.krotko(Mock.dzien(0)), days = o.days || [[dz, dz]];
    modal({
      title: 'Nowa wizyta', ok: 'Dodaj',
      body: `<label class="p-lab">Klientka<input class="p-in" name="kl" required placeholder="Imię i nazwisko"></label>
        <label class="p-lab">Usługa<select class="p-in" name="us">${SVC.map((s, i) => `<option value="${i}"${i === Math.max(0, SVC.findIndex(x => !o.miejsce || x[3] <= o.miejsce)) ? ' selected' : ''}>${esc(s[0])} · ${s[2]} zł · ${s[3]} min</option>`).join('')}</select></label>
        <label class="p-lab">Stylistka<select class="p-in" name="st">${STYL.map(s => `<option${s.n === o.stylistka ? ' selected' : ''}>${esc(s.n)}</option>`).join('')}</select></label>
        <label class="p-lab"${o.days ? '' : ' hidden'}>Dzień<select class="p-in" name="dz">${days.map(d => `<option value="${esc(d[1])}"${d[1] === o.dzien ? ' selected' : ''}>${esc(d[0])}</option>`).join('')}</select></label>
        <label class="p-lab">Godzina<select class="p-in" name="t">${SLOTS.map(x => `<option${x === (o.godz || '10:00') ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <p id="nw-err" role="alert" hidden style="margin:0;padding:10px 12px;border-radius:10px;background:#FDECEC;color:#A3262A;font-size:14px;line-height:1.4"></p>`,
      onOk(f) {
        const s = SVC[+f.us.value];
        // o.check(stylistka, godzina, minuty, dzień) from the calendar: a reason when the hour is taken, '' when free
        const why = o.check ? o.check(f.st.value, f.t.value, s[3], f.dz.value) : '';
        const err = f.querySelector('#nw-err'); err.hidden = !why; err.textContent = why ? 'Nie można dodać: ' + why + ' Wybierz inną godzinę albo stylistkę.' : '';
        if (why) { f.t.focus(); return false; }
        Mock.addVisit({ kategoria: s[1], usluga: s[0], opis: s[0], cena: s[2], czas: s[3], czasTekst: window.PS.min(s[3]), studio: 'Studio Malwa', lok: Mock.lok(), stylistka: f.st.value, dzien: f.dz.value, godzina: f.t.value, klientka: f.kl.value.trim(), status: 'nadchodząca', zrodlo: 'panel' });
        if (o.done) o.done();
      },
      toast: f => `Dodano wizytę: ${f.kl.value.trim()}, ${f.t.value}`
    });
  }

  const quoteState = () => Mock.get('wyceny', {}); // {id: {status, kwota, czas}}
  function newQuotes() {
    const st = quoteState();
    const own = Mock.get('quotes', []).filter(q => !(st[q.id] && st[q.id].status === 'wysłana') && q.status !== 'wysłana');
    return QUOTES.filter(q => !(st[q.id] && st[q.id].status === 'wysłana')).length + own.length;
  }

  function notes() {
    const list = [];
    Mock.reklamacje().filter(r => r.status === 'nowa').forEach(r =>
      list.push({ id: 'rk' + r.id, t: 'Reklamacja', d: `${r.klientka} · ${r.usluga}: ${r.opis.slice(0, 50)}${r.opis.length > 50 ? '…' : ''}`, href: 'opinie-studio.html#reklamacje', isNew: true }));
    Mock.get('visits', []).filter(v => v.status === 'nadchodząca' && !v.zrodlo).slice(0, 3).forEach(v =>
      list.push({ id: 'v' + v.id, t: 'Nowa rezerwacja', d: `${v.klientka || 'Klientka online'} · ${v.opis || v.usluga || 'wizyta'} · ${[v.dzien, v.godzina].filter(Boolean).join(' ')}`, href: 'panel.html#nowe', isNew: true }));
    notesA(list);
    list.push(
      { id: 'n1', t: 'Nowa rezerwacja', d: `Gosia L. · hybryda M · ${Mock.krotko(Mock.dzien(1))}, 9:00`, href: 'panel.html#nowe', isNew: true },
      { id: 'n2', t: 'SMS nie dotarł', d: 'Celina M. · przypomnienie na jutro 14:00 (numer poza zasięgiem)', href: 'klientki.html', isNew: true },
      { id: 'n3', t: 'Prośba o wycenę', d: 'Hania Z. wysłała zdjęcie inspiracji', href: 'wyceny.html', isNew: true },
      { id: 'n4', t: 'Niski stan w magazynie', d: 'Żel budujący: zostało 2 szt.', href: 'magazyn.html', isNew: false },
      { id: 'n5', t: 'Nowa opinia', d: 'Anna K. oceniła wizytę, czeka na odpowiedź', href: 'opinie-studio.html', isNew: false });
    return list;
  }
  // Etap A in the bell: expired and expiring stock batches (magazyn.html), announcements and new team tasks (zespol.html, tab "Zadania")
  function notesA(list) {
    const kon = [];
    Mock.magazyn().forEach(x => (x.partie || []).filter(p => !p.utyl).forEach(p => {
      const w = Mock.waznosc(p), d = p.wazne.split('-').reverse().slice(0, 2).join('.');
      if (w === 'przeterminowane') list.push({ id: 'exp-' + x.n + p.nr, t: 'Przeterminowana partia', d: `${x.n}, ${p.nr}: termin minął ${d}. Nie użyjesz jej na wizycie.`, href: 'magazyn.html', isNew: true });
      if (w === 'kończy się') kon.push(`${x.n} (${d})`);
    }));
    if (kon.length) list.push({ id: 'exp-k' + kon.length, t: 'Kończy się termin ważności', d: kon.join(', '), href: 'magazyn.html', isNew: false });
    const Z = Mock.zadania();
    Z.ogl.forEach(o => list.push({ id: 'ogl-' + o.id, t: 'Ogłoszenie ' + Mock.odKogo(o.od), d: o.t, href: 'zespol.html#zadania', isNew: true }));
    Z.lista.filter(z => z.nowe && !z.done).forEach(z => list.push({ id: 'zad-' + z.id, t: 'Nowe zadanie dla: ' + z.kto, d: z.t, href: 'zespol.html#zadania', isNew: true }));
  }
  const readIds = () => Mock.get('panel.read', []);
  const unread = () => notes().filter(n => n.isNew && !readIds().includes(n.id)).length;

  function openBell() {
    const read = readIds();
    modal({
      title: 'Powiadomienia',
      noOk: true,
      body: `<div style="display:flex;flex-direction:column;gap:8px">${notes().map(n => `<a class="pn-ntf${n.isNew && !read.includes(n.id) ? ' new' : ''}" href="${n.href}"><b>${esc(n.t)}</b><span style="color:#625860;font-size:13px">${esc(n.d)}</span></a>`).join('')}</div><button type="button" class="p-btn sm" id="pn-readall">Oznacz wszystkie jako przeczytane</button>`,
      onOpen(f, d) {
        f.querySelector('#pn-readall').addEventListener('click', () => {
          Mock.set('panel.read', notes().map(n => n.id));
          refresh();
          d.close();
          Mock.toast('Oznaczono jako przeczytane');
        });
      }
    });
  }

  function refresh() {
    const bell = document.getElementById('pn-bell');
    if (bell) { const n = unread(); bell.querySelector('i').textContent = n; bell.querySelector('i').hidden = !n; bell.setAttribute('aria-label', `Powiadomienia (${n} nowe)`); }
    const nq = document.getElementById('pn-quotes');
    if (nq) { const n = newQuotes(); nq.textContent = n; nq.hidden = !n; }
  }

  // Konto w makiecie: Mock "studioUser" = { imie, email, rola }. Brak = właścicielka. Menu chowa pozycje wg roli (bez blokady adresów, to makieta).
  // Role są danymi: Mock "role" (zespol.html je edytuje), domyślnie te pięć. PS.ROLES zawsze czyta aktualne.
  const ROLES = [
    { k: 'właścicielka', n: 'Właścicielka', hide: [] },
    { k: 'menedzerka', n: 'Menedżerka', hide: ['ustawienia.html'] },
    { k: 'recepcja', n: 'Recepcja', hide: ['raporty.html', 'ustawienia.html', 'cennik.html', 'zespol.html', 'profil-studia.html', 'marketing.html'] },
    { k: 'stylistka-plus', n: 'Stylistka z dostępem rozszerzonym', hide: ['kasa.html', 'raporty.html', 'ustawienia.html', 'zespol.html', 'profil-studia.html', 'marketing.html', 'cennik.html'] },
    { k: 'stylistka', n: 'Stylistka podstawowa', hide: ['kasa.html', 'raporty.html', 'ustawienia.html', 'zespol.html', 'profil-studia.html', 'marketing.html', 'cennik.html', 'karnety.html', 'promocje.html', 'magazyn.html', 'formularze.html', 'opinie-studio.html'] }
  ];
  const studioUser = () => Mock.get('studioUser', null);
  const nazwa = () => (Mock.get('profil', {}) || {}).nm || 'Studio Malwa'; // saved by onboarding.html and profil-studia.html
  const inicjaly = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  console.assert(inicjaly('Studio Testowe') === 'ST' && inicjaly('Studio Malwa') === 'SM', 'inicjaly');
  const roles = () => Mock.get('role', null) || ROLES;
  const setRoles = l => { Mock.set('role', l); drawNav(); refresh(); };
  const roleOf = k => roles().find(r => r.k === k) || roles()[0];
  function logout() { Mock.set('studioUser', null); Mock.toast('Wylogowano'); setTimeout(() => { location.href = 'panel-logowanie.html'; }, 500); }

  function drawNav() {
    const nav = document.getElementById('panel-nav');
    if (nav) {
      const cur = nav.dataset.active || file();
      nav.className = 'pn';
      nav.parentElement.style.alignContent = 'flex-start'; // when the menu wraps above the content, its row must not stretch to fill the page's min-height
      nav.setAttribute('aria-label', 'Menu panelu');
      nav.innerHTML = `<div class="pn-logo" style="display:flex;gap:10px;align-items:center;padding:0 8px 12px"><div style="width:36px;height:36px;border-radius:10px;background:#9E1F50;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:700">${esc(inicjaly(nazwa()))}</div><span style="font-weight:700">${esc(nazwa())}</span></div>` +
        NAV.map(([g, items0], i) => { const items = items0.filter(it => !roleOf((studioUser() || {}).rola).hide.includes(it[1])); return (items.length ? `<div class="pn-g">${g}</div>` : '') +
          items.map(([l, h, b]) => `<a class="pn-a" href="${h}"${h === cur ? ' aria-current="page"' : ''}>${l}${b ? '<span class="pn-n" id="pn-quotes"></span>' : ''}</a>`).join(''); }).join('');
    }
    return nav;
  }

  function init() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const nav = drawNav();
    const main = document.querySelector('main');
    if (main && nav) {
      main.id = main.id || 'main-content'; main.tabIndex = -1; main.style.outline = 'none';
      document.body.insertAdjacentHTML('afterbegin', `<a class="pn-skip" href="#${main.id}">Przejdź do treści</a>`);
      const bar = document.createElement('div');
      bar.className = 'pn-bar';
      const u = studioUser() || {};
      bar.innerHTML = `<details class="pn-user"><summary aria-label="Konto: ${esc(u.imie || 'Joanna Malec')}, ${esc(roleOf(u.rola).n)}"><b>${esc(u.imie || 'Joanna Malec')}</b><small>${esc(roleOf(u.rola).n)}</small></summary><div class="pn-menu"><button type="button" id="pn-out">Wyloguj</button></div></details>` +
        `<button type="button" class="pn-bell" id="pn-bell" aria-label="Powiadomienia"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><i></i></button>`;
      const L = lokalizacje(), wyb = Mock.get('lokalizacja', 0) || 0;
      if (L.length > 1) (document.getElementById('pn-lok-slot') || bar).insertAdjacentHTML('afterbegin', `<label class="pn-lok" style="display:flex;align-items:center;gap:6px;margin-right:auto;font-size:13px;color:#625860">Lokalizacja<select id="pn-lok" class="p-in s" style="max-width:220px">${L.map((l, i) => `<option value="${i}"${i === wyb ? ' selected' : ''}>${esc(l.n)}</option>`).join('')}</select></label>`);
      main.prepend(bar);
      main.style.alignContent = "flex-start"; // a wrapping main (klientki, wiadomosci) must not spread its spare height between the rows: the top bar used to jump
      // every page reads its data for the chosen location on load, so a switch reloads it (profil-studia switches its form in place)
      const ls = document.getElementById('pn-lok'); if (ls) ls.addEventListener('change', () => { Mock.set('lokalizacja', +ls.value);
        if (main.hasAttribute('data-lok-live')) return Mock.toast('Panel: ' + L[+ls.value].n);
        Mock.set('flash', 'Panel: ' + L[+ls.value].n); location.reload(); });
      bar.querySelector('.pn-bell').addEventListener('click', openBell);
      bar.querySelector('#pn-out').addEventListener('click', logout);
      const det = bar.querySelector('details');
      document.addEventListener('click', e => { if (!det.contains(e.target)) det.open = false; });
      det.addEventListener('keydown', e => { if (e.key === 'Escape') { det.open = false; det.querySelector('summary').focus(); } });
    }
    refresh();
    const flash = Mock.get('flash', null); // komunikat przekazany z poprzedniej strony (np. „Witaj w zespole”)
    if (flash) { Mock.set('flash', null); Mock.toast(flash); }
    window.addEventListener('storage', e => { if (e.key === 'mock.role') drawNav(); refresh(); });
  }

  // Płatne dodatki abonamentu: Mock "dodatki" = { podpisy: bool }, domyślnie wyłączone.
  const addon = k => !!(Mock.get('dodatki', {}) || {})[k];
  const setAddon = (k, v) => Mock.set('dodatki', { ...(Mock.get('dodatki', {}) || {}), [k]: v });
  const signUpsell = () => `<div class="p-row" style="flex-direction:column;align-items:flex-start"><b>Podpisy elektroniczne to dodatek</b><span style="line-height:1.45">Klientki podpiszą zgody na telefonie przed wizytą. 29 zł / mies.</span><a class="p-btn sm dark" href="ustawienia.html#dodatki">Włącz dodatek</a></div>`;

  // Import kalendarza (Google/Apple) do elementu el: wybór kalendarza, plik .ics liczony lokalnie albo przykład. Wynik: Mock "kalendarz.import" = { zrodlo, n }.
  const wizyt = n => `${n} ${n === 1 ? 'wizytę' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'wizyty' : 'wizyt'}`;
  console.assert(wizyt(1) === '1 wizytę' && wizyt(3) === '3 wizyty' && wizyt(12) === '12 wizyt' && wizyt(22) === '22 wizyty', 'plural wizyt');
  function calImport(el) {
    let src = 'Google', n = null;
    const done = Mock.get('kalendarz.import', null);
    el.innerHTML = `<div class="p-pills" role="group" aria-label="Z jakiego kalendarza">${['Google', 'Apple'].map((k, i) => `<button type="button" class="p-pill" style="min-height:44px" data-src="${k}" aria-pressed="${!i}">Kalendarz ${k}</button>`).join('')}</div>
      <label class="p-btn dash" style="cursor:pointer">Wybierz plik .ics<input type="file" accept=".ics,text/calendar" class="p-sr" data-ics></label>
      <button type="button" class="p-btn" data-sample>Użyj przykładowego kalendarza</button>
      <span class="p-mut" data-help>Google: Ustawienia kalendarza → Importuj i eksportuj → Eksportuj. Apple: Plik → Eksportuj → Eksportuj. Plik jest liczony tylko w przeglądarce, nic nie jest wysyłane.</span>
      <div class="p-box" role="status" aria-live="polite"><span data-st>${done ? `Zaimportowano ${wizyt(done.n)} z Kalendarza ${esc(done.zrodlo)}.` : 'Nie wybrano kalendarza.'}</span><button type="button" class="p-btn pri" data-imp hidden>Zaimportuj</button></div>`;
    const st = el.querySelector('[data-st]'), go = el.querySelector('[data-imp]');
    const found = (label) => { st.textContent = `Kalendarz ${src}: znaleziono ${wizyt(n)}${label}.`; go.hidden = false; };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-src]');
      if (b) { src = b.dataset.src; el.querySelectorAll('[data-src]').forEach(x => x.setAttribute('aria-pressed', x === b)); if (n !== null) found(''); }
      if (e.target.closest('[data-sample]')) { n = 12; found(' (przykład)'); }
      if (e.target.closest('[data-imp]')) { Mock.set('kalendarz.import', { zrodlo: src, n }); st.textContent = `Zaimportowano ${wizyt(n)} z Kalendarza ${src}.`; go.hidden = true; Mock.toast(`Zaimportowano ${wizyt(n)} z Kalendarza ${src}`); }
    });
    el.querySelector('[data-ics]').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      n = ((await f.text()).match(/^BEGIN:VEVENT/gm) || []).length;
      if (!n) { go.hidden = true; st.textContent = `${f.name}: w pliku nie ma wizyt. Wybierz plik .ics z kalendarzem.`; return; }
      found(` w pliku ${f.name}`);
    });
  }

  // locations: each has its own team, hours, visits, stations and cash (Mock.lok, per-location keys in mock.js); h = [od, do, zamknięte] pn…nd, none = the profile's hours
  const LOK0 = [{ n: 'Studio Malwa – Centrum', adres: 'ul. Puławska 24, Warszawa' }, { n: 'Studio Malwa – Mokotów', adres: 'ul. Odyńca 15, Warszawa',
    h: [['10:00', '18:00', false], ['10:00', '18:00', false], ['10:00', '18:00', false], ['10:00', '18:00', false], ['10:00', '18:00', false], ['9:00', '14:00', false], ['9:00', '14:00', true]] }];
  const lokalizacje = () => Mock.get('lokalizacje', null) || LOK0;
  // team of each location: colour, services [nazwa, minuty, zł] for the sample calendar, default weekly schedule (zespol.html)
  // shortcut: a location added in the profile borrows Centrum's team; a real panel would start it with nobody
  const ZESPOLY = [[
    { n: 'Magda', rola: 'paznokcie', c: '#9E1F50', t: '#F8EAF0', us: [['Hybryda', 75, 140], ['Żel · french', 120, 190], ['Przedłużanie', 150, 200], ['Velvet', 110, 200]], grafik: ['9–18', '9–18', '9–18', '9–18', '9–18', '9–14', '—'] },
    { n: 'Ewelina', rola: 'rzęsy, brwi, paznokcie', c: '#2F7A8C', t: '#E7F2F4', us: [['Rzęsy 1:1', 90, 150], ['Laminacja brwi', 90, 120], ['Brwi', 60, 70], ['Hybryda', 75, 140]], grafik: ['9–18', '9–18', '9–18', '9–18', '9–18', '9–14', '—'] }
  ], [
    { n: 'Ola', rola: 'strzyżenie, modelowanie', c: '#C27A12', t: '#FBF0DF', us: [['Strzyżenie', 60, 120], ['Modelowanie', 60, 90], ['Grzywka', 30, 40]], grafik: ['10–18', '10–18', '—', '10–18', '10–18', '9–14', '—'] },
    { n: 'Natalia', rola: 'koloryzacja, keratyna', c: '#5B4BA5', t: '#EEEBF8', us: [['Koloryzacja', 150, 320], ['Balejaż', 180, 450], ['Keratyna', 120, 380]], grafik: ['10–18', '10–18', '10–18', '10–18', 'urlop', '9–14', '—'] }
  ]];
  const STYL = ZESPOLY[Mock.lok()] || ZESPOLY[0];
  window.PS = { dziennik, log, kiedy, urzadzenie, STYL, lokalizacje, ROLES, NAV, calImport, addon, setAddon, signUpsell, esc, modal, visitModal, SVC, SLOTS, QUOTES, newQuotes, refresh, quoteState, min: m => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`) };
  Object.defineProperty(window.PS, 'ROLES', { get: roles }); window.PS.setRoles = setRoles; // the edited roles, not the defaults
  init();
})();
