// "Zgłoś problem": a small menu (quick or detailed report), then the form. Loaded by mock.js on first click.
// Sends to /api/zgloszenie (Netlify function → Discord forum); the lists below mirror netlify/zgloszenie-core.mjs, which validates them again.
const MAX = 8 * 1024 * 1024, PLIKOW = 3, MIN = 10, OBRAZY = ['image/png', 'image/jpeg', 'image/webp'];
// On GitHub Pages reports go to the Cloudflare Worker (fill in its address after creating it); on Netlify to its function.
const WORKER = '';
const ADRES = location.hostname.endsWith('github.io') ? WORKER : '/api/zgloszenie';

// [value, card title, short name, card hint, colour, sign]
const TYPY = [['blad', 'Znalazłem/am błąd', 'Błąd', 'Coś nie działa albo działa źle', '#A3262A', '!'], ['nieintuicyjne', 'Coś działa nieintuicyjnie', 'Nieintuicyjne', 'Trudno się domyślić, co zrobić', '#C27A12', '?'],
  ['zmiana', 'Chcę zaproponować zmianę', 'Propozycja zmiany', 'Wiem, jak zrobić to lepiej', '#2F7A8C', '↻'], ['funkcja', 'Brakuje mi funkcji', 'Brakuje funkcji', 'Czegoś tu nie ma, a powinno być', '#5B4BA5', '+'],
  ['inne', 'Mam ogólną sugestię', 'Inna sugestia', 'Cokolwiek innego', '#625860', '…']];
const ROLE = [['wlasciciel', 'Właściciel firmy'], ['menedzer', 'Menedżer'], ['pracownik', 'Pracownik'], ['klient', 'Klient'], ['tester', 'Tester zewnętrzny']];
const MODULY = [['logowanie', 'Rejestracja / logowanie'], ['kalendarz', 'Kalendarz / rezerwacje'], ['wyszukiwarka', 'Wyszukiwarka firm'], ['profil', 'Profil firmy'],
  ['klienci', 'Baza klientów'], ['pracownicy', 'Zarządzanie pracownikami'], ['platnosci', 'Płatności'], ['inne', 'Inny obszar']];
const CZESTOSC = [['zawsze', 'Za każdym razem'], ['czesto', 'Bardzo często'], ['czasem', 'Sporadycznie'], ['raz', 'Tylko raz']];
const WAGA = [['4', 'Uniemożliwia dalszą pracę', 'Blokuje pracę', '#A3262A'], ['3', 'Znacznie utrudnia korzystanie', 'Mocno utrudnia', '#C2410C'],
  ['2', 'Niewygodne, ale można kontynuować', 'Niewygodne', '#B7791F'], ['1', 'Drobny problem wizualny', 'Drobiazg', '#625860']];
// [field, number in the detailed form, question, placeholder]
const BLAD = [['proba', '05', 'Co próbowałeś/aś zrobić?', 'Np. chciałam przenieść wizytę na inną godzinę'], ['opis', '06', 'Co się wydarzyło?', 'Opisz, co zobaczyłeś/aś'],
  ['oczekiwane', '07', 'Jak powinno to działać?', 'Opisz oczekiwany rezultat'], ['kroki', '08', 'Jak ponownie wywołać problem?', '1. Otwórz… 2. Kliknij… 3. …']];
const POMYSL = [['trudne', '11', 'Co wydaje Ci się nieintuicyjne albo zbyt skomplikowane?', 'Np. nie wiem, gdzie zmienić godziny pracy'],
  ['zmiana', '12', 'Co zmieniłbyś/zmieniłabyś w wyglądzie, układzie lub działaniu?', 'Opisz proponowaną zmianę'], ['brakuje', '13', 'Jakiej funkcji najbardziej Ci brakuje?', 'Jak pomogłaby w codziennej pracy?']];

const ik = (d, w = 18, sw = 2) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const X = ik('M6 6l12 12M18 6L6 18'), WSTECZ = ik('M15 18l-6-6 6-6'), DALEJ = ik('M5 12h14M13 6l6 6-6 6'), KOSZ = ik('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13');
const OBRAZ = ik('M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 15l5-5 4 4 3-3 6 6', 26), OK = ik('M5 12.5l4.5 4.5L19 7.5', 42, 2.2);
const ZNAK = '<svg aria-hidden="true" width="40" height="28" viewBox="0 0 44 30"><circle cx="15" cy="15" r="13" fill="#E7B7C0"/><circle cx="22" cy="15" r="13" fill="#C9577F" fill-opacity=".9"/><circle cx="29" cy="15" r="13" fill="#9E1F50" fill-opacity=".9"/></svg>';
const h = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const miejsce = () => document.title.replace(/\s·\sOdcień$/, '').replace(/\s[–-]\s/g, ' → ') || location.pathname;
const INFO = ADRES ? 'Wyślemy też adres strony, rozmiar ekranu i nazwę przeglądarki. Zgłoszenie zobaczy zespół na naszym Discordzie.'
  : 'Zapiszemy zgłoszenie na tym urządzeniu razem z adresem strony, rozmiarem ekranu i nazwą przeglądarki.';

const CSS = `
.zg-menu{margin:0;position:fixed;width:400px;max-width:calc(100% - 32px);padding:10px;border:1px solid #E4D9DE;border-radius:20px;box-shadow:0 18px 48px rgba(30,10,18,.22)}
.zg-menu::backdrop{background:transparent}
.zg-menu.zg-arkusz{inset:auto 0 0 0;width:100%;max-width:none;padding:10px 16px 24px;border:0;border-radius:24px 24px 0 0;box-shadow:0 -10px 30px rgba(30,10,18,.18)}
.zg-menu.zg-arkusz::backdrop{background:rgba(30,26,29,.45)}
.zg-arkusz::before{content:'';display:block;width:40px;height:5px;border-radius:99px;background:#E4D9DE;margin:0 auto 6px}
.zg-m-g{display:flex;align-items:center;gap:10px;padding:6px 12px 4px}
.zg-m-g h2{margin:0;flex:1;font-size:13px;font-weight:700;color:#625860}
.zg-arkusz .zg-m-g{padding:4px 0}.zg-arkusz .zg-m-g h2{font:700 22px 'Bricolage Grotesque',sans-serif;color:#1E1A1D}
.zg-m-x{display:none !important}.zg-arkusz .zg-m-x{display:flex !important}
.zg-opcja{width:100%;min-height:72px;padding:12px;border:0;border-radius:14px;background:#FFFFFF;display:flex;align-items:center;gap:14px;text-align:left;font:inherit;color:#1E1A1D;cursor:pointer}
.zg-opcja+.zg-opcja{margin-top:4px}
.zg-opcja.on,.zg-opcja:hover{background:#F6EDF1}
.zg-opcja:focus-visible{outline:2px solid #9E1F50;outline-offset:-2px}
.zg-arkusz .zg-opcja{border:1px solid #E4D9DE;margin-top:8px}.zg-arkusz .zg-opcja.on{border:2px solid #9E1F50}
.zg-arkusz .zg-opcja small{display:none}.zg-arkusz .zg-opcja em{display:block;margin:2px 0 0}
.zg-ik{width:44px;height:44px;flex:none;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#F6EDF1;color:#9E1F50}
.zg-opcja.on .zg-ik{background:#9E1F50;color:#FFFFFF}
.zg-opcja>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:3px}
.zg-opcja b{font-size:16px}.zg-opcja em{font-style:normal;font-size:12px;color:#625860;margin-left:8px}
.zg-opcja small{font-size:14px;color:#625860;line-height:1.4}
.zg-m-stopka{margin:4px 8px 0;padding:10px 4px 6px;border-top:1px solid #F0E8EC;font-size:13px;color:#625860;line-height:1.45}
.zg-arkusz .zg-m-stopka{border:0;margin:4px 0 0;padding:4px 2px 0}
dialog.zg-dlg{width:min(760px,calc(100% - 32px));max-height:calc(100dvh - 32px);padding:0;border-radius:28px;display:flex;flex-direction:column;overflow:hidden}
dialog.zg-dlg:not([open]){display:none}
.zg-dlg>form{flex:1;min-height:0;display:flex;flex-direction:column}
.zg-gl{padding:24px 32px 18px;border-bottom:1px solid #F0E8EC;display:flex;flex-direction:column;gap:16px}
.zg-gl-r{display:flex;align-items:flex-start;gap:14px}
.zg-gl-r>div{flex:1;min-width:0}
.zg-gl h2{margin:0;font:700 26px/1.15 'Bricolage Grotesque',sans-serif;letter-spacing:-.3px}.zg-gl h2:focus{outline:none}
.zg-gl p{margin:4px 0 0;color:#625860;font-size:15px;line-height:1.45}
.zg-ikb{width:44px;height:44px;flex:none;padding:0;border-radius:12px;border:1px solid #E4D9DE;background:#FFFFFF;color:#1E1A1D;display:flex;align-items:center;justify-content:center;cursor:pointer}
.zg-post{display:flex;flex-direction:column;gap:8px;font-size:13px}.zg-post>div:first-child{display:flex;justify-content:space-between;gap:8px}
.zg-post b{color:#9E1F50}.zg-post span{color:#625860}
.zg-pasek{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.zg-pasek i{height:6px;border-radius:99px;background:#F0E8EC}.zg-pasek i.on{background:#9E1F50}
.zg-cialo{flex:1;min-height:0;overflow:auto;padding:4px 32px 20px}
.zg-sek{padding:22px 0 26px;display:flex;flex-direction:column;gap:22px;border-bottom:1px solid #F0E8EC}.zg-sek:last-of-type{border-bottom:0}
.zg-szcz .zg-sek{border-bottom:0}
.zg-sek h3{margin:0;font:700 19px 'Bricolage Grotesque',sans-serif}
.zg-sek h3 span{font:500 13px 'DM Sans',sans-serif;color:#625860;margin-left:6px}
.zg-pole,.zg-galaz{display:flex;flex-direction:column;gap:8px;border:0;margin:0;padding:0;min-width:0}
.zg-galaz{gap:22px}
.zg-q{padding:0;margin-bottom:2px;display:flex;gap:10px;align-items:baseline;font-weight:700;font-size:16px;line-height:1.35}
.zg-nr{font:700 15px 'Bricolage Grotesque',sans-serif;color:#9E1F50}
.zg-wym{color:#9E1F50}
.zg-pom{font-size:13px;color:#625860;line-height:1.45;margin:0}
.zg-in,.zg-ta,.zg-sel{min-height:52px;padding:0 16px;border-radius:14px;border:1px solid #C9B6BF;font:inherit;font-size:16px;color:#1E1A1D;background:#FFFFFF;box-sizing:border-box;width:100%}
.zg-ta{min-height:0;padding:12px 16px;line-height:1.45;resize:vertical}
.zg-in:focus,.zg-ta:focus,.zg-sel:focus{outline:2px solid #9E1F50;outline-offset:1px;border-color:#9E1F50}
.zg-dlg [aria-invalid=true]{border-color:#A3262A}
.zg-err{color:#A3262A;font-size:13px}
.zg-chipy{display:flex;flex-wrap:wrap;gap:8px}
.zg-chip,.zg-karta,.zg-opt{position:relative;cursor:pointer;background:#FFFFFF;border:1px solid #E4D9DE;color:#1E1A1D;box-sizing:border-box}
.zg-chip input,.zg-karta input,.zg-opt input,.zg-zgoda input,.zg-drop input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.zg-chip{min-height:44px;padding:0 16px;border-radius:999px;display:inline-flex;align-items:center;gap:8px;font-size:15px}
.zg-karty{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.zg-karta{min-height:76px;padding:12px 16px;border-radius:16px;display:flex;align-items:center;gap:14px}
.zg-karta b{display:block;font-size:15px}.zg-karta small{display:block;font-size:13px;color:#625860;margin-top:2px}
.zg-zn{width:40px;height:40px;flex:none;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#FFFFFF}
.zg-kr{width:10px;height:10px;flex:none;border-radius:99px}
:is(.zg-chip,.zg-karta,.zg-opt):has(input:checked){background:#F6EDF1;border:2px solid #9E1F50;font-weight:700}
.zg-chip:has(input:checked){color:#9E1F50}
.zg-szcz .zg-chip:has(input:checked)::before{content:'✓'}
:is(.zg-chip,.zg-karta,.zg-opt,.zg-zgoda,.zg-drop):has(input:focus-visible){outline:2px solid #9E1F50;outline-offset:2px}
.zg-dwa{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.zg-kafle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.zg-opt{min-height:44px;padding:0 10px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;text-align:center}
.zg-seg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #E4D9DE;border-radius:14px;overflow:hidden}
.zg-seg .zg-opt{border:0;border-radius:0;min-height:52px}.zg-seg .zg-opt+.zg-opt{border-left:1px solid #E4D9DE}
.zg-seg .zg-opt:has(input:checked){background:#9E1F50;color:#FFFFFF;border:0}
.zg-seg .zg-opt:has(input:checked)+.zg-opt{border-left:1px solid #E4D9DE}
.zg-wiersze{display:flex;flex-direction:column;gap:8px}
.zg-wiersze .zg-opt{min-height:52px;justify-content:flex-start;padding:0 16px;gap:14px;font-size:15px;border-radius:14px;text-align:left}
.zg-bar{display:flex;gap:4px}.zg-bar i{width:10px;height:18px;border-radius:3px;background:#F0E8EC}
.zg-drop{position:relative;border:2px dashed #C9B6BF;border-radius:20px;background:#FAF6F8;padding:26px 20px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;cursor:pointer}
.zg-drop.nad{border-color:#9E1F50;background:#F6EDF1}
.zg-szyb .zg-drop{flex-direction:row;text-align:left;padding:18px 20px}
.zg-dik{width:52px;height:52px;flex:none;border-radius:16px;background:#FFFFFF;border:1px solid #E4D9DE;display:flex;align-items:center;justify-content:center;color:#9E1F50}
.zg-drop b{font-size:16px}.zg-drop u{color:#9E1F50}.zg-drop small{display:block;font-size:13px;color:#625860;line-height:1.5;margin-top:4px}
.zg-drop kbd{font:inherit;font-weight:700;padding:1px 7px;border-radius:6px;border:1px solid #E4D9DE;background:#FFFFFF}
.zg-tel{display:none}
.zg-pliki{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.zg-plik{display:flex;align-items:center;gap:14px;padding:10px;border:1px solid #E4D9DE;border-radius:16px}
.zg-plik img{width:88px;height:60px;object-fit:cover;border-radius:10px;border:1px solid #E4D9DE;flex:none;background:#F6EDF1}
.zg-plik span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:13px;color:#625860}
.zg-plik b{font-size:15px;color:#1E1A1D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zg-plik button{color:#A3262A}
.zg-uwaga{margin:0;padding:12px 14px;border-radius:14px;background:#FFF6E5;color:#6B3A0C;font-size:14px;line-height:1.45}
.zg-zgoda{position:relative;display:flex;align-items:center;gap:12px;min-height:44px;font-weight:700;font-size:16px;cursor:pointer}
.zg-zgoda i{width:22px;height:22px;flex:none;box-sizing:border-box;border-radius:7px;border:2px solid #C9B6BF;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-style:normal;font-size:14px}
.zg-zgoda:has(input:checked) i{background:#9E1F50;border-color:#9E1F50}.zg-zgoda:has(input:checked) i::before{content:'✓'}
.zg-kontakt .zg-in{max-width:420px}
.zg-stopka{padding:16px 32px 24px;border-top:1px solid #F0E8EC;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.zg-stopka small{flex:1;min-width:220px;font-size:13px;color:#625860;line-height:1.45}
.zg-btn{min-height:52px;padding:0 24px;border-radius:14px;border:1px solid #E4D9DE;background:#FFFFFF;color:#1E1A1D;font:inherit;font-weight:700;font-size:16px;display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}
.zg-btn.gl{border:0;background:#9E1F50;color:#FFFFFF}.zg-btn.gl:hover{background:#7A173D}.zg-btn:disabled{opacity:.6;cursor:progress}
.zg-btn:focus-visible,.zg-ikb:focus-visible{outline:2px solid #9E1F50;outline-offset:2px}
.zg-stan{width:100%;margin:0;padding:10px 12px;border-radius:10px;font-size:14px;background:#FDECEC;color:#A3262A}
.zg-ok{padding:48px 32px;display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center;overflow:auto}
.zg-ok-ik{width:88px;height:88px;border-radius:28px;background:#F6EDF1;color:#9E1F50;display:flex;align-items:center;justify-content:center}
.zg-ok h2{margin:0;font:700 30px/1.15 'Bricolage Grotesque',sans-serif}.zg-ok h2:focus{outline:none}
.zg-ok p{margin:0;color:#625860;font-size:16px;line-height:1.5;max-width:460px}
.zg-pods{padding:12px 16px;border-radius:16px;background:#FAF6F8;border:1px solid #F0E8EC;font-size:14px}
.zg-ok-p{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
@media (max-width:639px){
  dialog.zg-dlg{width:100%;max-width:none;height:100dvh;max-height:none;margin:0;border-radius:0}
  .zg-gl{padding:14px 16px 12px;gap:12px}.zg-gl h2{font-size:22px}.zg-gl p{display:none}
  .zg-cialo{padding:0 16px 16px}.zg-stopka{padding:12px 16px 20px}.zg-stopka small{display:none}.zg-stopka .gl{flex:1}
  .zg-karty,.zg-dwa{grid-template-columns:1fr}
  .zg-karta{min-height:52px;padding:0 12px}.zg-karta small{display:none}.zg-zn{width:32px;height:32px;font-size:16px;border-radius:10px}
  .zg-seg{grid-template-columns:repeat(2,minmax(0,1fr))}.zg-seg .zg-opt:nth-child(3){border-left:0}.zg-seg .zg-opt:nth-child(n+3){border-top:1px solid #E4D9DE}
  .zg-szyb .zg-drop{flex-direction:column;text-align:center}.zg-komp{display:none}.zg-tel{display:inline}
  .zg-plik img{width:64px;height:44px}
  .zg-ok{padding:40px 16px}.zg-ok h2{font-size:26px}
}`;
const styl = () => { if (!document.getElementById('zg-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'zg-css', textContent: CSS })); };

let wybor;
const otwarte = {};
const opcja = (tryb, n, meta, opis, sciezka, on) => `<button type="button" class="zg-opcja${on ? ' on' : ''}" data-tryb="${tryb}"><span class="zg-ik">${ik(sciezka, 20)}</span><span><span><b>${n}</b><em>${meta}</em></span><small>${opis}</small></span></button>`;

// The menu under the button that opened it; a sheet from the bottom on phones.
export function menu(btn) {
  styl();
  if (!wybor) {
    wybor = Object.assign(document.createElement('dialog'), { className: 'zg-menu' });
    wybor.setAttribute('aria-labelledby', 'zg-m-t');
    wybor.innerHTML = `<div class="zg-m-g"><h2 id="zg-m-t">Jak chcesz zgłosić?</h2><button type="button" class="zg-ikb zg-m-x" aria-label="Zamknij">${X}</button></div>
      ${opcja('szybkie', 'Szybkie zgłoszenie', '1 strona · ok. 1 min', 'Coś nie działa albo masz krótki pomysł.', 'M13 3L5 14h6l-1 7 8-11h-6z', true)}
      ${opcja('szczegolowe', 'Szczegółowe zgłoszenie', '3 kroki · ok. 3 min', 'Pełny opis błędu: kroki, częstość, waga.', 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01')}
      <p class="zg-m-stopka">Dołączymy adres tej strony (<b>${h(miejsce())}</b>) i rozmiar ekranu.</p>`;
    wybor.addEventListener('click', e => {
      const t = e.target.closest('[data-tryb]'), r = wybor.getBoundingClientRect();
      if (t) { wybor.close(); otworz(t.dataset.tryb); }
      else if (e.target.closest('.zg-m-x') || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) wybor.close();
    });
    document.body.append(wybor);
  }
  const tel = matchMedia('(max-width: 639px)').matches;
  wybor.classList.toggle('zg-arkusz', tel);
  wybor.style.left = wybor.style.top = '';
  if (!tel && btn) {
    const r = btn.getBoundingClientRect(), w = Math.min(400, innerWidth - 32);
    const pasek = r.width > r.height; // the button in the top bar; the "Uwagi" tab on the edge is tall
    wybor.style.left = Math.max(16, Math.min(pasek ? r.left + r.width / 2 - w / 2 : r.left - w - 8, innerWidth - w - 16)) + 'px';
    wybor.style.top = Math.max(16, pasek ? r.bottom + 8 : r.top + r.height / 2 - 140) + 'px';
  }
  wybor.showModal();
  wybor.querySelector('[data-tryb]').focus();
}

export function otworz(tryb = 'szybkie') {
  styl();
  const d = otwarte[tryb] || (otwarte[tryb] = zbuduj(tryb === 'szczegolowe' ? 'szczegolowe' : 'szybkie'));
  d.showModal();
  d.querySelector('h2').focus();
}

function zbuduj(tryb) {
  const sz = tryb === 'szczegolowe', d = Object.assign(document.createElement('dialog'), { className: 'zg-dlg ' + (sz ? 'zg-szcz' : 'zg-szyb') });
  d.setAttribute('aria-labelledby', 'zg-t-' + tryb);
  let krok = 1;
  const pliki = [];
  const id = n => `zg-${n}-${tryb}`, nr = n => sz && n ? `<span class="zg-nr">${n}</span>` : '', WYM = ' <b class="zg-wym">*</b>';
  const grupa = (n, q, tresc) => `<fieldset class="zg-pole"><legend class="zg-q">${nr(n)}<span>${q}</span></legend>${tresc}</fieldset>`;
  const chip = (name, [v, t], extra = '') => `<label class="zg-chip"><input type="radio" name="${name}" value="${v}"${extra}><span>${t}</span></label>`;
  const lista = (name, opcje, q, n) => sz ? grupa(n, q, `<div class="zg-chipy">${opcje.map(o => chip(name, o)).join('')}</div>`)
    : `<div class="zg-pole"><label class="zg-q" for="${id(name)}">${q}</label><select class="zg-sel" id="${id(name)}" name="${name}"><option value="">Wybierz…</option>${opcje.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>`;
  const ta = ([name, n, q, ph], wym, err) => `<div class="zg-pole"><label class="zg-q" for="${id(name)}">${nr(n)}<span>${q}${wym ? WYM : ''}</span></label>
    <textarea class="zg-ta" id="${id(name)}" name="${name}" rows="${wym ? 3 : 2}" maxlength="900" placeholder="${ph}"${err ? ` aria-describedby="${id('e-' + err)}"` : ''}></textarea>${wym ? `<span class="zg-err" id="${id('e-' + name)}" role="alert" hidden></span>` : ''}</div>`;
  const sek = (k, tytul, tresc) => `<section class="zg-sek" data-krok="${k}">${tytul ? `<h3>${tytul}</h3>` : ''}${tresc}</section>`;

  const typy = sz
    ? `<div class="zg-karty">${TYPY.map(([v, n, , opis, c, z], i) => `<label class="zg-karta"><input type="radio" name="typ" value="${v}"${i ? '' : ' checked'}><span class="zg-zn" style="background:${c}">${z}</span><span><b>${n}</b><small>${opis}</small></span></label>`).join('')}</div>`
    : `<div class="zg-chipy">${TYPY.map(([v, , k, , c], i) => `<label class="zg-chip"><input type="radio" name="typ" value="${v}"${i ? '' : ' checked'}><span class="zg-kr" style="background:${c}"></span><span>${k}</span></label>`).join('')}</div>`;
  const gdzie = `<div class="zg-pole"><label class="zg-q" for="${id('gdzie')}">${nr('04')}<span>${sz ? 'W którym miejscu aplikacji to zauważyłeś/aś?' : 'Gdzie to zauważyłeś/aś?'}</span></label>
    <input class="zg-in" id="${id('gdzie')}" name="gdzie" maxlength="200" value="${h(miejsce())}"><span class="zg-pom">Wpisaliśmy nazwę strony, na której jesteś. Możesz ją zmienić.</span></div>`;
  const s1 = sz ? sek(1, '', lista('rola', ROLE, 'W jakiej roli korzystasz z aplikacji?', '01') + grupa('02', 'Czego dotyczy Twoje zgłoszenie?', typy) + lista('modul', MODULY, 'Którego modułu dotyczy?', '03') + gdzie)
    : sek(1, 'O zgłoszeniu', grupa('', 'Czego dotyczy zgłoszenie?' + WYM, typy) + `<div class="zg-dwa">${lista('rola', ROLE, 'Twoja rola')}${lista('modul', MODULY, 'Moduł')}</div>` + gdzie);

  const czest = grupa('09', sz ? 'Jak często występuje problem?' : 'Jak często?', `<div class="${sz ? 'zg-seg' : 'zg-kafle'}">${CZESTOSC.map(([v, t]) => `<label class="zg-opt"><input type="radio" name="czestosc" value="${v}"><span>${t}</span></label>`).join('')}</div>`);
  const waga = grupa('10', sz ? 'Jak bardzo utrudnia korzystanie z aplikacji?' : 'Jak bardzo przeszkadza?', `<div class="${sz ? 'zg-wiersze' : 'zg-kafle'}">${WAGA.map(([v, dl, kr, c]) => `<label class="zg-opt"><input type="radio" name="waga" value="${v}">${sz
    ? `<span class="zg-bar" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i${i <= +v ? ` style="background:${c}"` : ''}></i>`).join('')}</span>` : `<span class="zg-kr" style="background:${c}"></span>`}<span>${sz ? dl : kr}</span></label>`).join('')}</div>`);
  const bledy = (sz ? BLAD : [BLAD[1], BLAD[0], BLAD[2], BLAD[3]]).map(p => ta(p, p[0] === 'opis', p[0] === 'opis' && 'opis')).join('');
  const galazie = `<fieldset class="zg-galaz" data-galaz="blad">${bledy}${sz ? czest + waga : `<div class="zg-dwa">${czest}${waga}</div>`}</fieldset>
    <fieldset class="zg-galaz" data-galaz="pomysl" hidden disabled><p class="zg-pom">Wypełnij choć jedno pole.</p><span class="zg-err" id="${id('e-pomysl')}" role="alert" hidden></span>${POMYSL.map(p => ta(p, false, 'pomysl')).join('')}</fieldset>`;
  const s2 = sz ? sek(2, '', galazie) : `<section class="zg-sek" data-krok="2"><h3 data-t2>Opisz błąd</h3>${galazie}</section>`;

  const zrzut = `<div class="zg-pole">${sz ? `<div class="zg-q">${nr('14')}<span>Dołącz zrzut ekranu</span></div>` : ''}
    <label class="zg-drop"><span class="zg-dik">${OBRAZ}</span><span><b><span class="zg-komp">Przeciągnij zrzut tutaj albo <u>wybierz plik</u></span><span class="zg-tel"><u>Dodaj zrzut z galerii</u></span></b>
      <small><span class="zg-komp">Możesz też wkleić zrzut ze schowka: <kbd>Ctrl</kbd> + <kbd>V</kbd>. </span>PNG, JPG albo WebP · do ${PLIKOW} obrazów, razem do 8 MB</small></span>
      <input type="file" accept="${OBRAZY.join(',')}" multiple aria-describedby="${id('e-plik')}"></label>
    <span class="zg-err" id="${id('e-plik')}" role="alert" hidden></span>
    <ul class="zg-pliki" aria-label="Dołączone zrzuty" hidden></ul>
    <p class="zg-uwaga">Przed wysłaniem ukryj dane osobowe innych osób, np. imiona i telefony klientek.</p></div>`;
  const pk = `<div class="zg-pole zg-kontakt"><label class="zg-pom" for="${id('kontakt')}">E-mail albo telefon do kontaktu</label><input class="zg-in" id="${id('kontakt')}" name="kontakt" autocomplete="email" maxlength="120"></div>`;
  const kontakt = sz ? grupa('15', 'Czy możemy się z Tobą skontaktować w sprawie zgłoszenia?', `<div class="zg-chipy">${chip('zgoda', ['tak', 'Tak'], ' checked')}${chip('zgoda', ['nie', 'Nie'])}</div>`) + pk
    : `<div class="zg-pole"><label class="zg-zgoda"><input type="checkbox" name="zgoda" value="tak" checked><i aria-hidden="true"></i>Możecie się ze mną skontaktować w sprawie zgłoszenia</label>${pk}</div>`;
  const s3 = sz ? sek(3, '', zrzut + kontakt) : sek(3, 'Zrzut ekranu<span>opcjonalnie</span>', zrzut) + sek(3, '', kontakt);

  d.innerHTML = `<form novalidate>
    <header class="zg-gl"><div class="zg-gl-r">${sz ? `<button type="button" class="zg-ikb" data-wstecz aria-label="Wstecz" hidden>${WSTECZ}</button>` : ZNAK}
      <div><h2 id="zg-t-${tryb}" tabindex="-1"${sz ? ` aria-describedby="${id('etap')}"` : ''}>Zgłoś uwagę</h2><p data-pod>${sz ? 'Formularz dla testerów aplikacji. Każda uwaga trafia prosto do zespołu odcienia.' : `Jeden formularz, około 2 minuty. Pola z gwiazdką${WYM} są wymagane.`}</p></div>
      <button type="button" class="zg-ikb" data-zamknij aria-label="Zamknij">${X}</button></div>
      ${sz ? `<div class="zg-post"><div><b id="${id('etap')}" data-etap></b><span data-etap-i></span></div><div class="zg-pasek" aria-hidden="true"><i></i><i></i><i></i></div></div>` : ''}</header>
    <div class="zg-cialo">${s1}${s2}${s3}<input name="pulapka" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px"></div>
    <footer class="zg-stopka"><p class="zg-stan" data-stan role="status" hidden></p>${sz ? '<button type="button" class="zg-btn" data-wstecz hidden>Wstecz</button>' : ''}<small>${INFO}</small>
      ${sz ? `<button type="button" class="zg-btn gl" data-dalej>Dalej${DALEJ}</button>` : ''}<button type="submit" class="zg-btn gl" data-wyslij${sz ? ' hidden' : ''}>Wyślij zgłoszenie</button></footer>
  </form><div class="zg-ok" hidden></div>`;
  document.body.append(d);

  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)], f = $('form');
  const blad = (k, t) => { const e = $('#' + id('e-' + k)); e.hidden = !t; e.textContent = t || ''; };
  const stan = t => { const e = $('[data-stan]'); e.hidden = !t; e.textContent = t || ''; };
  const galaz = () => f.typ.value === 'blad' ? 'blad' : 'pomysl';
  const zgoda = () => sz ? f.zgoda.value === 'tak' : f.zgoda.checked;
  const nazwa = (l, v) => (l.find(x => x[0] === v) || [])[1] || '';

  const odswiez = () => {
    const g = galaz(), t2 = g === 'blad' ? 'Opisz błąd' : 'Twój pomysł';
    $$('[data-galaz]').forEach(el => { el.hidden = el.disabled = el.dataset.galaz !== g; });
    $('.zg-kontakt').hidden = !zgoda();
    if (!sz) { $('[data-t2]').textContent = t2; return; }
    $$('[data-krok]').forEach(el => { el.hidden = +el.dataset.krok !== krok; });
    $('[data-etap]').textContent = `Krok ${krok} z 3 · ${['O zgłoszeniu', g === 'blad' ? 'Zgłaszanie problemu' : 'Usprawnienia i nowe funkcje', 'Materiały i kontakt'][krok - 1]}`;
    $('[data-etap-i]').textContent = ['około 3 minuty', g === 'blad' ? 'pole z * jest wymagane' : 'wypełnij choć jedno pole', 'oba pola są opcjonalne'][krok - 1];
    $$('.zg-pasek i').forEach((i, n) => i.classList.toggle('on', n < krok));
    $('h2').textContent = ['Zgłoś uwagę', t2, 'Zrzut ekranu i kontakt'][krok - 1];
    $('[data-pod]').textContent = krok === 1 ? 'Formularz dla testerów aplikacji. Każda uwaga trafia prosto do zespołu odcienia.'
      : krok === 2 ? [nazwa(TYPY, f.typ.value), nazwa(MODULY, f.modul.value)].filter(Boolean).join(' · ') : 'Ostatni krok. Oba pola są opcjonalne.';
    $$('[data-wstecz]').forEach(b => { b.hidden = krok === 1; });
    $('[data-dalej]').hidden = krok === 3;
    $('[data-wyslij]').hidden = krok !== 3;
  };
  const idz = k => { krok = k; odswiez(); $('.zg-cialo').scrollTop = 0; $('h2').focus(); };

  // the required answer: "Co się wydarzyło?" for a bug, one of questions 11-13 otherwise
  const sprawdzOpis = () => {
    $$('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    blad('opis', ''); blad('pomysl', '');
    if (galaz() === 'blad') {
      if (f.opis.value.trim().length >= MIN) return true;
      blad('opis', `Opisz, co się wydarzyło, w co najmniej ${MIN} znakach.`); f.opis.setAttribute('aria-invalid', 'true'); f.opis.focus(); return false;
    }
    const pola = POMYSL.map(([k]) => f[k]);
    if (pola.some(p => p.value.trim().length >= MIN)) return true;
    blad('pomysl', `Wypełnij choć jedno pole, w co najmniej ${MIN} znakach.`); pola.forEach(p => p.setAttribute('aria-invalid', 'true')); pola[0].focus(); return false;
  };

  const ul = $('.zg-pliki'), input = $('.zg-drop input'), strefa = $('.zg-drop');
  const pokaz = () => {
    ul.hidden = !pliki.length;
    ul.replaceChildren(...pliki.map((p, i) => {
      const li = Object.assign(document.createElement('li'), { className: 'zg-plik' }), u = URL.createObjectURL(p);
      li.innerHTML = `<img alt=""><span><b></b>${p.size < 1048576 ? Math.ceil(p.size / 1024) + ' kB' : (p.size / 1048576).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' MB'}</span><button type="button" class="zg-ikb">${KOSZ}</button>`;
      const img = li.querySelector('img'); img.src = u; img.onload = img.onerror = () => URL.revokeObjectURL(u);
      li.querySelector('b').textContent = p.name;
      const b = li.querySelector('button'); b.setAttribute('aria-label', 'Usuń ' + p.name);
      b.addEventListener('click', () => { pliki.splice(i, 1); pokaz(); input.focus(); });
      return li;
    }));
  };
  const dodaj = nowe => {
    blad('plik', '');
    for (const p of nowe) {
      if (!OBRAZY.includes(p.type)) { blad('plik', 'Zrzut musi być obrazem PNG, JPG albo WebP.'); continue; }
      if (pliki.length >= PLIKOW) { blad('plik', `Możesz dołączyć najwyżej ${PLIKOW} zrzuty.`); break; }
      if (pliki.reduce((s, x) => s + x.size, p.size) > MAX) { blad('plik', 'Zrzuty mogą mieć razem najwyżej 8 MB.'); continue; }
      pliki.push(p);
    }
    pokaz();
  };
  input.addEventListener('change', () => { dodaj([...input.files]); input.value = ''; });
  strefa.addEventListener('dragover', e => { e.preventDefault(); strefa.classList.add('nad'); });
  strefa.addEventListener('dragleave', () => strefa.classList.remove('nad'));
  strefa.addEventListener('drop', e => { e.preventDefault(); strefa.classList.remove('nad'); dodaj([...e.dataTransfer.files]); });
  d.addEventListener('paste', e => {
    const im = [...e.clipboardData.items].filter(i => i.kind === 'file' && i.type.startsWith('image/')).map(i => i.getAsFile());
    if (im.length) { e.preventDefault(); dodaj(im); }
  });

  f.addEventListener('change', e => { if (['typ', 'zgoda'].includes(e.target.name)) odswiez(); });
  $('[data-zamknij]').addEventListener('click', () => d.close());
  if (sz) {
    $('[data-dalej]').addEventListener('click', () => { if (krok === 2 && !sprawdzOpis()) return; idz(krok + 1); });
    $$('[data-wstecz]').forEach(b => b.addEventListener('click', () => idz(krok - 1)));
  }

  // no address to send to: keep the report on this device (Narzędzia makiety → Uwagi z testów), screenshots scaled down to fit localStorage
  const lokalnie = async dane => {
    const zrzuty = [];
    for (const p of pliki) try {
      const img = await createImageBitmap(p), k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); zrzuty.push(c.toDataURL('image/jpeg', 0.7));
    } catch { /* unreadable image: keep the text */ }
    const l = Mock.get('zgloszenia', []) || [];
    l.push({ czas: new Date().toISOString(), ...dane, zrzuty });
    Mock.set('zgloszenia', l);
    if ((Mock.get('zgloszenia', []) || []).length === l.length) gotowe(false); // false when localStorage is full or off
    else stan('Nie udało się zapisać uwagi. Spróbuj bez zrzutów ekranu.');
  };
  const gotowe = wyslane => {
    const w = galaz() === 'blad' ? (WAGA.find(x => x[0] === f.waga.value) || [])[2] : '';
    const pods = [[nazwa(TYPY.map(t => [t[0], t[2]]), f.typ.value), nazwa(MODULY, f.modul.value)].filter(Boolean).join(' · '), w,
      pliki.length ? `${pliki.length} ${pliki.length === 1 ? 'zrzut' : 'zrzuty'}` : ''].filter(Boolean).join(' | ');
    const ok = $('.zg-ok');
    ok.innerHTML = `<span class="zg-ok-ik">${OK}</span><h2 tabindex="-1">Dziękujemy, zgłoszenie ${wyslane ? 'wysłane' : 'zapisane'}</h2>
      <p>${wyslane ? (zgoda() && f.kontakt.value.trim() ? 'Odezwiemy się, jeśli będziemy potrzebować szczegółów.' : 'Zespół odcienia przeczyta je na Discordzie.') : 'Zapisaliśmy je na tym urządzeniu. Odczyta je osoba prowadząca test.'}</p>
      <div class="zg-pods">${h(pods)}</div><div class="zg-ok-p"><button type="button" class="zg-btn" data-kolejna>Zgłoś kolejną uwagę</button><button type="button" class="zg-btn gl" data-wroc>Wróć do aplikacji</button></div>`;
    f.hidden = true; ok.hidden = false;
    delete otwarte[tryb]; // the next report starts from a clean form
    ok.querySelector('[data-wroc]').addEventListener('click', () => d.close());
    ok.querySelector('[data-kolejna]').addEventListener('click', () => { d.close(); otworz(tryb); });
    ok.querySelector('h2').focus();
  };
  d.addEventListener('close', () => { if (otwarte[tryb] !== d) d.remove(); });

  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (sz && krok < 3) return $('[data-dalej]').click(); // Enter in a field moves on, it does not send
    stan('');
    if (!sprawdzOpis()) { if (sz) { idz(2); sprawdzOpis(); } return; }
    const fd = new FormData(f); // fields of the hidden branch sit in a disabled fieldset and are left out
    fd.delete('zgoda');
    if (!zgoda()) fd.delete('kontakt');
    fd.append('tryb', tryb);
    fd.append('strona', location.pathname + location.search.replace(/[^\w\-./?=&%]/g, encodeURIComponent));
    fd.append('ekran', `${innerWidth}x${innerHeight}`);
    fd.append('przegladarka', navigator.userAgent.slice(0, 200));
    const dane = Object.fromEntries([...fd].filter(([k, v]) => typeof v === 'string' && k !== 'pulapka'));
    pliki.forEach(p => fd.append('plik', p, p.name || 'zrzut.png'));
    const btn = $('[data-wyslij]'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Wysyłam…';
    try {
      if (!ADRES) return await lokalnie(dane);
      const r = await fetch(ADRES, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) });
      const ct = r.headers.get('content-type') || '', j = ct.includes('json') ? await r.json() : {};
      if (r.ok) gotowe(true);
      else if (r.status === 422 && j.errors) {
        if (sz && (j.errors.opis || j.errors.pomysl || j.errors.plik)) idz(j.errors.plik ? 3 : 2);
        for (const k of ['opis', 'pomysl', 'plik']) if (j.errors[k]) blad(k, j.errors[k]);
        stan('Popraw zaznaczone pola.');
      } else if (r.status === 404 || !ct.includes('json')) await lokalnie(dane); // local server without the function
      else stan(j.error || 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
    } catch { stan('Brak połączenia. Spróbuj ponownie za chwilę.'); }
    finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Wyślij zgłoszenie'; }
  });
  odswiez();
  return d;
}
