// "Zgłoś problem" dialog, loaded by mock.js on first click. Sends to /api/zgloszenie (Netlify function → Discord forum).
const MAX = 8 * 1024 * 1024;
// On GitHub Pages reports go to the Cloudflare Worker (fill in its address after creating it); on Netlify to its function.
const WORKER = '';
const ADRES = location.hostname.endsWith('github.io') ? WORKER : '/api/zgloszenie';
let dlg, plik = null;

function zbuduj() {
  dlg = document.createElement('dialog');
  dlg.setAttribute('aria-labelledby', 'zg-t');
  dlg.innerHTML = `<form id="zg-form" novalidate style="display:flex;flex-direction:column;gap:12px;font-size:15px">
    <h2 id="zg-t" style="margin:0;font-family:'Bricolage Grotesque',sans-serif;font-size:20px">Zgłoś problem</h2>
    <label style="display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:500">Rodzaj
      <select name="kategoria" style="min-height:44px;border-radius:12px;border:1px solid #C9B6BF;padding:0 10px;font:inherit;background:#fff">
        <option value="blad">Błąd, coś nie działa</option><option value="wyglad">Wygląd albo czytelność</option><option value="pomysl">Pomysł</option><option value="inne">Inne</option>
      </select></label>
    <label style="display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:500">Co się stało?
      <textarea name="opis" rows="4" required aria-describedby="zg-opis-err" placeholder="Np. w kreatorze rzęs po kliknięciu Dalej nic się nie dzieje" style="padding:10px 12px;border-radius:12px;border:1px solid #C9B6BF;font:inherit;resize:vertical"></textarea></label>
    <span id="zg-opis-err" role="alert" hidden style="color:#A3262A;font-size:13px;margin-top:-6px"></span>
    <div style="display:flex;flex-direction:column;gap:6px">
      <span style="font-size:14px;font-weight:500">Zrzut ekranu (opcjonalnie)</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" hidden>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button type="button" data-zg-plik style="min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #9E1F50;background:#fff;color:#9E1F50;font:inherit;font-weight:700;cursor:pointer">Dodaj zrzut</button>
        <span style="color:#625860;font-size:13px">albo wklej go tutaj (Ctrl+V)</span>
      </div>
      <div data-zg-podglad hidden style="display:flex;gap:10px;align-items:center"><img alt="Podgląd zrzutu ekranu" style="width:96px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #E4D9DE"><button type="button" data-zg-usun style="min-height:44px;padding:0 12px;border-radius:10px;border:1px solid #E4D9DE;background:#fff;font:inherit;cursor:pointer">Usuń zrzut</button></div>
      <span id="zg-plik-err" role="alert" hidden style="color:#A3262A;font-size:13px"></span>
    </div>
    <label style="display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:500">Kontakt (opcjonalnie)
      <input name="kontakt" autocomplete="email" placeholder="e-mail, jeśli chcesz odpowiedź" style="min-height:44px;border-radius:12px;border:1px solid #C9B6BF;padding:0 12px;font:inherit"></label>
    <input name="pulapka" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">
    <span style="color:#625860;font-size:12px;line-height:1.45">Wyślemy opis, zrzut (jeśli go dodasz), adres tej strony, rozmiar ekranu i nazwę przeglądarki. Nie wysyłamy danych z Twojego konta. Zgłoszenie zobaczy zespół na naszym Discordzie.</span>
    <p data-zg-stan role="status" hidden style="margin:0;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.45"></p>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" data-zg-zamknij style="min-height:44px;padding:0 16px;border-radius:12px;border:1px solid #E4D9DE;background:#fff;font:inherit;cursor:pointer">Anuluj</button>
      <button type="submit" data-zg-wyslij style="min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#9E1F50;color:#fff;font:inherit;font-weight:700;cursor:pointer">Wyślij zgłoszenie</button>
    </div>
  </form>`;
  document.body.appendChild(dlg);
  const $ = s => dlg.querySelector(s), input = $('input[type=file]');
  const blad = (id, t) => { const e = $('#' + id); e.hidden = !t; e.textContent = t || ''; };
  const stan = (t, typ) => { const e = $('[data-zg-stan]'); e.hidden = !t; e.textContent = t || ''; e.style.background = typ === 'ok' ? '#E6F2EC' : typ === 'err' ? '#FDECEC' : '#EAF0F7'; e.style.color = typ === 'ok' ? '#1F6B47' : typ === 'err' ? '#A3262A' : '#1E1A1D'; };
  const ustawPlik = f => {
    blad('zg-plik-err', '');
    if (f && !['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) return blad('zg-plik-err', 'Zrzut musi być obrazem PNG, JPG albo WebP.');
    if (f && f.size > MAX) return blad('zg-plik-err', 'Zrzut może mieć najwyżej 8 MB.');
    plik = f || null;
    const p = $('[data-zg-podglad]'); p.hidden = !plik;
    if (plik) { const img = p.querySelector('img'); URL.revokeObjectURL(img.src); img.src = URL.createObjectURL(plik); }
  };
  $('[data-zg-plik]').addEventListener('click', () => input.click());
  input.addEventListener('change', () => ustawPlik(input.files[0]));
  $('[data-zg-usun]').addEventListener('click', () => { input.value = ''; ustawPlik(null); });
  dlg.addEventListener('paste', e => { const it = [...e.clipboardData.items].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); ustawPlik(it.getAsFile()); } });
  $('[data-zg-zamknij]').addEventListener('click', () => dlg.close());
  $('#zg-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, opis = f.opis.value.trim();
    f.opis.removeAttribute('aria-invalid'); blad('zg-opis-err', ''); stan('');
    if (opis.length < 10) { blad('zg-opis-err', 'Opisz problem w co najmniej 10 znakach.'); f.opis.setAttribute('aria-invalid', 'true'); f.opis.focus(); return; }
    const fd = new FormData();
    for (const k of ['kategoria', 'opis', 'kontakt', 'pulapka']) fd.append(k, f[k].value);
    fd.append('strona', location.pathname + location.search);
    fd.append('ekran', `${innerWidth}x${innerHeight}`);
    fd.append('przegladarka', navigator.userAgent.slice(0, 200));
    if (plik) fd.append('plik', plik, plik.name || 'zrzut.png');
    const btn = $('[data-zg-wyslij]'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Wysyłam…';
    try {
      if (!ADRES) { stan('Zgłoszenia nie są jeszcze skonfigurowane.', 'info'); return; }
      const r = await fetch(ADRES, { method: 'POST', body: fd, signal: AbortSignal.timeout(20000) });
      const ct = r.headers.get('content-type') || '', d = ct.includes('json') ? await r.json() : {};
      if (r.ok) { stan('Dziękujemy! Zgłoszenie trafiło do zespołu.', 'ok'); f.reset(); ustawPlik(null); setTimeout(() => dlg.close(), 1800); }
      else if (r.status === 422 && d.errors) { if (d.errors.opis) blad('zg-opis-err', d.errors.opis); if (d.errors.plik) blad('zg-plik-err', d.errors.plik); stan('Popraw zaznaczone pola.', 'err'); }
      else if (r.status === 404 || !ct.includes('json')) stan('W makiecie uruchomionej lokalnie zgłoszenia nie są wysyłane. Na stronie publicznej trafią na Discorda.', 'info');
      else stan(d.error || 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.', 'err');
    } catch { stan('Brak połączenia. Spróbuj ponownie za chwilę.', 'err'); }
    finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Wyślij zgłoszenie'; }
  });
}

export function otworz() {
  if (!dlg) zbuduj();
  dlg.showModal();
  dlg.querySelector('textarea').focus();
}
