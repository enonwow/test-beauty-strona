// Shared search for start.html and wyniki.html: the "Usługa / Gdzie / Kiedy" card, the "Kiedy" picker and the filters sheet.
// State: Mock "search" = { q, miasto, kiedy, dni } (dni = days from today for slot links), Mock "filtry" = see F0.
(() => {
  const KIEDY = [['Teraz', 'wolne w ciągu 2 h'], ['Dziś', ''], ['Jutro', ''], ['Ten tydzień', ''], ['Weekend', '']];
  const F0 = { godz: '', od: null, do: null, km: 0, hh: false, pay: [], udog: [] };
  const GODZ = [['', 'Dowolna'], ['rano', 'Rano do 12:00'], ['pol', '12:00–16:00'], ['po16', 'Po 16:00']];
  const CENY = [100, 200, 300], KM = [[1, 'do 1 km'], [2, 'do 2 km'], [5, 'do 5 km'], [0, 'dowolna']];
  const PAY = [['blik', 'BLIK'], ['karta', 'Karta'], ['gotówka', 'Gotówka']];
  const UDOG = [['parking', 'Parking'], ['klimatyzacja', 'Klimatyzacja'], ['bez-schodow', 'Wejście bez schodów'], ['wifi', 'Wi‑Fi']];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const filtry = () => ({ ...F0, ...(Mock.get('filtry', {}) || {}) });
  // how many filters are on (price range counts once, payment counts once)
  const ile = f => (f.godz ? 1 : 0) + (f.od !== null || f.do !== null ? 1 : 0) + (f.km ? 1 : 0) + (f.hh ? 1 : 0) + (f.pay.length ? 1 : 0) + f.udog.length;
  // days from today for a "Kiedy" label: Weekend = the coming Saturday (today when it is the weekend)
  const dni = k => (k === 'Jutro' ? 1 : k === 'Weekend' ? Math.max(0, 5 - Mock.weekday(Mock.dzien(0))) : 0);
  console.assert(ile(F0) === 0 && ile({ ...F0, godz: 'po16', do: 200, pay: ['blik', 'karta'] }) === 3, 'szukaj ile');

  const ICO = {
    q: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#625860" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    pin: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#625860" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    cal: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#625860" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    dn: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#625860" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;flex:none"><path d="M6 9l6 6 6-6"/></svg>',
    fl: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    ed: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E1F50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  };
  const CSS = `
.sc{display:flex;align-items:stretch;background:#FFFFFF;border-radius:16px;padding:8px;box-shadow:0 12px 32px rgba(30,10,18,.22);color:#1E1A1D}
.scf{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:10px;padding:6px 14px;border:0;background:none;font:inherit;text-align:left;cursor:pointer;border-radius:12px;color:#1E1A1D;min-height:48px}
.scf+.scf{border-left:1px solid #F0E8EC;border-radius:0}
.scf:hover{background:#FAF6F8}
.scf>span{display:flex;flex-direction:column;min-width:0;flex:1}
.scf small{font-size:12px;color:#625860}
.scf input{border:0;font:inherit;font-size:15px;padding:0;background:none;min-width:0;width:100%;outline-offset:3px;color:#1E1A1D}
.scf b{font-size:15px;font-weight:500;white-space:nowrap}
.scf.kiedy{flex:0 0 170px}
.scf[aria-expanded=true]{background:#F6EDF1;box-shadow:inset 0 0 0 2px #9E1F50;border-radius:12px}
.sc .row{display:flex;align-items:center;gap:8px;margin-left:8px}
.flt{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 14px;border-radius:12px;border:1px solid #E4D9DE;background:#FFFFFF;color:#1E1A1D;font:inherit;font-weight:500;cursor:pointer;white-space:nowrap}
.flt.on{border-color:#9E1F50;color:#9E1F50}
.flt i{font-style:normal;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:999px;background:#9E1F50;color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.szukaj{min-height:48px;padding:0 20px;border-radius:12px;border:0;background:#9E1F50;color:#FFFFFF;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}
.szukaj:hover{background:#7A173D}
.sc-zw{display:none}
.kpanel{position:absolute;z-index:60;width:340px;box-sizing:border-box;background:#FFFFFF;border-radius:16px;box-shadow:0 16px 40px rgba(30,10,18,.25);padding:12px;display:flex;flex-direction:column;gap:4px;color:#1E1A1D}
.kpanel .opt{display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 12px;border:0;border-radius:10px;background:none;font:inherit;font-size:15px;color:#1E1A1D;cursor:pointer;text-align:left}
.kpanel .opt:hover{background:#FAF6F8}
.kpanel .opt[aria-pressed=true]{background:#F6EDF1;color:#9E1F50;font-weight:700}
.kpanel .opt small{color:#625860;font-weight:400;font-size:12px}
.kh{display:flex;justify-content:space-between;align-items:center;padding:8px 4px 0 8px;font-weight:700}
.kh button{width:40px;height:40px;border:0;border-radius:10px;background:none;font:inherit;font-size:18px;cursor:pointer;color:#1E1A1D}
.kal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:8px 4px 4px;border-top:1px solid #F0E8EC;margin-top:4px;font-size:13px;text-align:center}
.kal b{font-size:12px;color:#625860;font-weight:500}
.kal button{min-height:36px;border:0;border-radius:8px;background:none;font:inherit;color:#1E1A1D;cursor:pointer}
.kal button:disabled{color:#C9B6BF;cursor:default}
.kal button[aria-pressed=true]{background:#9E1F50;color:#fff;font-weight:700}
.kdim{position:fixed;inset:0;background:rgba(30,10,18,.45);z-index:59}
dialog.fsheet{border:0;padding:0;width:520px;max-width:calc(100% - 32px);max-height:84vh;border-radius:20px;color:#1E1A1D;font-family:'DM Sans',sans-serif;box-shadow:0 16px 40px rgba(30,10,18,.25)}
dialog.fsheet[open]{display:flex;flex-direction:column}
dialog.fsheet::backdrop{background:rgba(30,10,18,.45)}
.fsheet .hd{display:flex;justify-content:space-between;align-items:center;padding:16px 12px 8px 20px}
.fsheet h2{margin:0;font:700 20px 'Bricolage Grotesque',sans-serif}
.fsheet .x{width:44px;height:44px;border:0;background:none;font-size:22px;color:#625860;cursor:pointer;border-radius:10px}
.fsheet .bd{overflow:auto;padding:4px 20px 12px;display:flex;flex-direction:column;gap:18px}
.fsheet fieldset{border:0;margin:0;padding:0;min-width:0}
.fsheet legend{padding:0;margin:0 0 8px;font-size:15px;font-weight:700}
.fsheet .ft{display:flex;gap:10px;padding:12px 20px 16px;border-top:1px solid #F0E8EC}
.pills{display:flex;flex-wrap:wrap;gap:8px}
.pills button{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid #E4D9DE;background:#fff;font:inherit;font-size:14px;color:#1E1A1D;cursor:pointer}
.pills button[aria-pressed=true]{border-color:#9E1F50;color:#9E1F50;font-weight:700;box-shadow:inset 0 0 0 1px #9E1F50}
.rng{display:flex;align-items:center;gap:8px}
.rng input{flex:1;min-width:0;min-height:44px;border:1px solid #C9B6BF;border-radius:10px;padding:0 12px;font:inherit}
.tg{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;cursor:pointer}
.tg input{appearance:none;width:44px;height:26px;border-radius:999px;background:#E4D9DE;position:relative;margin:0;flex:none;cursor:pointer}
.tg input::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}
.tg input:checked{background:#9E1F50}.tg input:checked::after{left:21px}
@media (max-width:1023px){
  .sc{flex-direction:column;gap:8px;padding:10px;box-shadow:0 6px 20px rgba(30,10,18,.10);border:1px solid #F0E8EC}
  .scf,.scf+.scf{border:1px solid #E4D9DE;border-radius:12px;min-height:52px}
  .scf.kiedy{flex:1 1 auto}
  .sc .row{margin:0}.sc .row .szukaj{flex:1}
  .kpanel{position:fixed;left:0;right:0;bottom:0;top:auto !important;width:auto;border-radius:20px 20px 0 0;padding:16px 16px 20px;max-height:88vh;overflow:auto}
  dialog.fsheet{width:100%;max-width:100%;margin:auto 0 0;border-radius:20px 20px 0 0;max-height:88vh}
  .zwijana .sc-zw{display:flex}.zwijana.open .sc-zw,.zwijana:not(.open) .sc{display:none}
}`;
  let css = false;
  const styl = () => { if (css) return; css = true; document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS })); };

  // ---- "Kiedy" picker: dropdown under the field on a computer, bottom sheet on a phone ----
  function kiedyPanel(btn, wartosc, wybierz) {
    const T = Mock.dzien(0), MAX = Mock.dzien(90);
    let mies = new Date(T.getFullYear(), T.getMonth(), 1), wyb = wartosc;
    const dim = Object.assign(document.createElement('div'), { className: 'kdim' });
    const p = Object.assign(document.createElement('div'), { className: 'kpanel' });
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Kiedy');
    const kal = () => {
      const first = (mies.getDay() + 6) % 7, n = new Date(mies.getFullYear(), mies.getMonth() + 1, 0).getDate();
      let h = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'].map(d => `<b>${d}</b>`).join('') + '<span></span>'.repeat(first);
      for (let d = 1; d <= n; d++) {
        const dt = new Date(mies.getFullYear(), mies.getMonth(), d), lab = Mock.krotko(dt);
        h += `<button type="button" data-d="${Mock.iso(dt)}" aria-pressed="${wyb === lab}" aria-label="${esc(Mock.dlugo(dt))}" ${dt < T || dt > MAX ? 'disabled' : ''}>${d}</button>`;
      }
      return h;
    };
    const rysuj = () => {
      p.innerHTML = KIEDY.map(([k, o]) => `<button type="button" class="opt" data-k="${k}" aria-pressed="${wyb === k}"><span>${k}${o ? ` <small>${o}</small>` : ''}</span>${wyb === k ? '<span aria-hidden="true">✓</span>' : ''}</button>`).join('')
        + `<div class="kh"><span>${Mock.MIES[mies.getMonth()][0].toUpperCase() + Mock.MIES[mies.getMonth()].slice(1)} ${mies.getFullYear()}</span><span><button type="button" data-m="-1" aria-label="Poprzedni miesiąc">‹</button><button type="button" data-m="1" aria-label="Następny miesiąc">›</button></span></div>`
        + `<div class="kal">${kal()}</div><button type="button" class="szukaj" data-ok style="margin-top:8px">Gotowe</button>`;
    };
    const zamknij = () => { p.remove(); dim.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', klaw); btn.focus(); };
    const klaw = e => { if (e.key === 'Escape') zamknij(); };
    p.addEventListener('click', e => {
      const o = e.target.closest('[data-k]'), d = e.target.closest('[data-d]'), m = e.target.closest('[data-m]');
      if (o) { wyb = o.dataset.k; wybierz(wyb, dni(wyb)); rysuj(); }
      if (d) { const dt = new Date(d.dataset.d + 'T12:00'); wyb = Mock.krotko(dt); wybierz(wyb, Mock.odDzis(dt)); rysuj(); }
      if (m) { mies = new Date(mies.getFullYear(), mies.getMonth() + +m.dataset.m, 1); rysuj(); }
      if (e.target.closest('[data-ok]')) zamknij();
    });
    dim.addEventListener('click', zamknij);
    rysuj();
    if (innerWidth < 1024) document.body.append(dim);
    else { const r = btn.getBoundingClientRect(); p.style.left = Math.min(r.left + scrollX, innerWidth - 356) + 'px'; p.style.top = r.bottom + scrollY + 8 + 'px'; setTimeout(() => document.addEventListener('click', function poza(e) { if (!p.contains(e.target) && !btn.contains(e.target)) { document.removeEventListener('click', poza); if (p.isConnected) zamknij(); } })); }
    document.body.append(p); btn.setAttribute('aria-expanded', 'true'); document.addEventListener('keydown', klaw);
    p.querySelector('[aria-pressed=true]')?.focus() || p.querySelector('.opt').focus();
  }

  // ---- filters sheet (the same on start and in results) ----
  function arkusz({ licz, zastosuj }) {
    styl();
    let f = filtry();
    const d = Object.assign(document.createElement('dialog'), { className: 'fsheet' });
    d.setAttribute('aria-labelledby', 'fs-h');
    const pills = (name, list, on) => `<div class="pills">${list.map(([v, l]) => `<button type="button" data-n="${name}" data-v="${v}" aria-pressed="${on(v)}">${l}</button>`).join('')}</div>`;
    const rysuj = () => {
      const n = licz ? licz(f) : null;
      d.innerHTML = `<div class="hd"><h2 id="fs-h">Filtry</h2><button type="button" class="x" data-x aria-label="Zamknij">✕</button></div><div class="bd">
        <fieldset><legend>Godzina</legend>${pills('godz', GODZ, v => f.godz === v)}</fieldset>
        <fieldset><legend>Cena usługi</legend><div class="rng"><input type="number" min="0" inputmode="numeric" id="fs-od" aria-label="Cena od (zł)" placeholder="od 0 zł" value="${f.od ?? ''}">–<input type="number" min="0" inputmode="numeric" id="fs-do" aria-label="Cena do (zł)" placeholder="do … zł" value="${f.do ?? ''}"></div>
          <div style="margin-top:8px">${pills('do', CENY.map(c => [c, `do ${c} zł`]), v => f.do === +v)}</div></fieldset>
        <fieldset><legend>Odległość</legend>${pills('km', KM, v => f.km === +v)}</fieldset>
        <label class="tg"><span><b>Tylko happy hours</b><br><span style="color:#625860;font-size:13px">tańsze godziny w studiach</span></span><input type="checkbox" role="switch" id="fs-hh" ${f.hh ? 'checked' : ''}></label>
        <fieldset><legend>Płatność</legend>${pills('pay', PAY, v => f.pay.includes(v))}</fieldset>
        <fieldset><legend>Udogodnienia</legend>${pills('udog', UDOG, v => f.udog.includes(v))}</fieldset>
      </div><div class="ft"><button type="button" class="flt" data-c>Wyczyść</button><button type="button" class="szukaj" data-ok style="flex:1">${n === null ? 'Zastosuj' : n ? `Pokaż ${Mock.plural(n, ['studio', 'studia', 'studiów'])}` : 'Brak studiów, poluzuj filtry'}</button></div>`;
    };
    const num = v => (v === '' ? null : Math.max(0, +v));
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-n]');
      if (b) {
        const { n, v } = b.dataset;
        if (n === 'godz') f.godz = v;
        if (n === 'do') f.do = f.do === +v ? null : +v;
        if (n === 'km') f.km = +v;
        if (n === 'pay' || n === 'udog') f[n] = f[n].includes(v) ? f[n].filter(x => x !== v) : [...f[n], v];
        const sc = d.querySelector('.bd').scrollTop; rysuj(); d.querySelector('.bd').scrollTop = sc; d.querySelector(`[data-n="${n}"][data-v="${v}"]`)?.focus();
      }
      if (e.target.closest('[data-c]')) { f = { ...F0 }; rysuj(); }
      if (e.target.closest('[data-x]')) d.close();
      if (e.target.closest('[data-ok]')) { Mock.set('filtry', f); zastosuj(f); d.close(); }
    });
    d.addEventListener('change', e => {
      if (e.target.id === 'fs-hh') f.hh = e.target.checked;
      if (e.target.id === 'fs-od') f.od = num(e.target.value);
      if (e.target.id === 'fs-do') f.do = num(e.target.value);
      if (f.od !== null && f.do !== null && f.od > f.do) [f.od, f.do] = [f.do, f.od];
      const sc = d.querySelector('.bd').scrollTop; rysuj(); d.querySelector('.bd').scrollTop = sc;
    });
    d.addEventListener('close', () => d.remove());
    rysuj(); document.body.append(d); d.showModal();
  }

  // ---- the search card ----
  // form: the <form role="search"> to fill; opts: { filtry: show "Filtry" in the card, zwijana: collapsed summary on phones, onSzukaj(search), onFiltry(f) }
  function karta(form, opts = {}) {
    styl();
    const s0 = Mock.get('search', {}) || {};
    let kiedy = s0.kiedy || 'Dziś', dniK = s0.dni ?? dni(kiedy);
    form.innerHTML = (opts.zwijana ? `<button type="button" class="sc-zw" aria-expanded="false" style="width:100%;min-height:52px;padding:0 14px;border-radius:14px;border:1px solid #E4D9DE;background:#fff;align-items:center;gap:10px;font:inherit;text-align:left;box-shadow:0 4px 14px rgba(30,10,18,.08);cursor:pointer">${ICO.q}<span style="display:flex;flex-direction:column;min-width:0;flex:1"><b class="zw-1" style="font-size:14px"></b><span class="zw-2" style="color:#625860;font-size:12px"></span></span><span aria-hidden="true">${ICO.ed}</span><span class="p-sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Zmień wyszukiwanie</span></button>` : '')
      + `<div class="sc"><label class="scf">${ICO.q}<span><small>Usługa</small><input id="q" type="search" autocomplete="off" placeholder="np. manicure, velvet" value="${esc(s0.q)}"></span></label>
      <label class="scf">${ICO.pin}<span><small>Gdzie</small><input id="city" type="text" autocomplete="address-level2" placeholder="Warszawa, Mokotów" value="${esc(s0.miasto || 'Warszawa, Mokotów')}"></span></label>
      <button type="button" class="scf kiedy" id="kiedy-btn" aria-haspopup="dialog" aria-expanded="false">${ICO.cal}<span><small>Kiedy</small><b id="kiedy-v"></b></span>${ICO.dn}</button>
      <div class="row">${opts.filtry ? `<button type="button" class="flt" id="filtry-btn">${ICO.fl}Filtry<i hidden></i></button>` : ''}<button type="submit" class="szukaj">Szukaj terminów</button></div></div>`;
    if (opts.zwijana) form.classList.add('zwijana');
    const $ = s => form.querySelector(s);
    const wartosc = () => ({ ...(Mock.get('search', {}) || {}), q: $('#q').value.trim(), miasto: $('#city').value.trim() || 'Warszawa, Mokotów', kiedy, dni: dniK });
    const maluj = () => {
      $('#kiedy-v').textContent = kiedy;
      if (opts.zwijana) { $('.zw-1').textContent = $('#q').value.trim() || 'Wszystkie usługi'; $('.zw-2').textContent = `${$('#city').value.trim() || 'Warszawa, Mokotów'} · ${kiedy}`; }
      const fb = $('#filtry-btn'); if (fb) { const n = ile(filtry()); fb.classList.toggle('on', n > 0); fb.querySelector('i').hidden = !n; fb.querySelector('i').textContent = n; fb.setAttribute('aria-label', n ? `Filtry, włączone: ${n}` : 'Filtry'); }
    };
    $('#kiedy-btn').addEventListener('click', e => { if ($('#kiedy-btn').getAttribute('aria-expanded') === 'true') return; e.stopPropagation(); kiedyPanel($('#kiedy-btn'), kiedy, (k, d) => { kiedy = k; dniK = d; maluj(); }); });
    $('#filtry-btn')?.addEventListener('click', () => arkusz({ zastosuj: () => { maluj(); opts.onFiltry?.(filtry()); } }));
    $('.sc-zw')?.addEventListener('click', () => { form.classList.add('open'); $('.sc-zw').setAttribute('aria-expanded', 'true'); $('#q').focus(); });
    form.addEventListener('submit', e => { e.preventDefault(); const s = wartosc(); Mock.set('search', s); form.classList.remove('open'); $('.sc-zw')?.setAttribute('aria-expanded', 'false'); maluj(); opts.onSzukaj?.(s); });
    maluj();
    return { wartosc, maluj };
  }

  // ---- search and filters in the address, so a results link can be sent (Mock keeps them too) ----
  const PK = ['q', 'gdzie', 'kiedy', 'dni', 'godz', 'od', 'do', 'km', 'hh', 'pay', 'udog'];
  function zUrl() {
    const p = new URLSearchParams(location.search);
    if (!PK.some(k => p.has(k))) return; // no search in the address: keep what Mock remembers
    const s = { ...(Mock.get('search', {}) || {}) };
    if (p.has('q')) s.q = p.get('q').slice(0, 80);
    if (p.has('gdzie')) s.miasto = p.get('gdzie').slice(0, 80);
    if (p.has('kiedy')) { s.kiedy = p.get('kiedy').slice(0, 20); s.dni = p.has('dni') ? Math.max(0, Math.min(90, parseInt(p.get('dni'), 10) || 0)) : dni(s.kiedy); }
    Mock.set('search', s);
    const n = k => (p.get(k) ?? '') !== '' && Number.isFinite(+p.get(k)) ? Math.max(0, +p.get(k)) : null;
    const lst = (k, ok) => (p.get(k) || '').split(',').filter(v => ok.some(o => o[0] === v));
    Mock.set('filtry', { ...F0, godz: GODZ.some(g => g[0] === p.get('godz')) ? p.get('godz') : '', od: n('od'), do: n('do'),
      km: KM.some(k => k[0] && k[0] === +p.get('km')) ? +p.get('km') : 0, hh: p.get('hh') === '1', pay: lst('pay', PAY), udog: lst('udog', UDOG) });
  }
  // base + current search and filters; other parameters (e.g. ?dzis= from the mock tools) stay
  function url(base) {
    const s = Mock.get('search', {}) || {}, f = filtry(), p = new URLSearchParams(location.search);
    PK.forEach(k => p.delete(k));
    const set = (k, v) => { if (v === '' || v === null || v === undefined || v === false || v === 0 || (Array.isArray(v) && !v.length)) return; p.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v)); };
    set('q', s.q); set('gdzie', s.miasto); set('kiedy', s.kiedy);
    if (s.kiedy && !KIEDY.some(k => k[0] === s.kiedy)) set('dni', s.dni); // a calendar date needs its day
    set('godz', f.godz); set('od', f.od); set('do', f.do); set('km', f.km); set('hh', f.hh); set('pay', f.pay); set('udog', f.udog);
    const q = p.toString();
    return base + (q ? '?' + q : '');
  }

  window.Szukaj = { karta, arkusz, filtry, ile, F0, zUrl, url };
})();
