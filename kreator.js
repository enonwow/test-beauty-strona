// Creator engine v2 for rzęsy, brwi, fryzjer and kosmetologia (design/SPEC-KREATORY-V2.md).
// One price-list format per category (cenniki/*.json) and one result shape:
//   { cenaMin, cenaMax, minuty, pozycje[], powodyPrzedzialu[], sciezka, komunikaty[], zakres[], usluga, opis, seria }
// sciezka: rezerwacja | test48h | konsultacja | blokada. A price range exists only with a named reason.
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const zl = n => (n < 0 ? '−' : '') + Math.abs(n) + ' zł';
  const dur = m => { const h = Math.floor(m / 60), r = m % 60; return ((h ? h + ' h' : '') + (h && r ? ' ' : '') + (r ? r + ' min' : '')) || '0 min'; };
  const zlRange = (a, b) => (b > a ? `${a}–${b} zł` : zl(a));
  const RANK = { rezerwacja: 0, test48h: 1, konsultacja: 2, blokada: 3 };
  const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);
  const by = (list, id) => list.find(x => x.id === id);

  // ---------- result helpers ----------
  const start = () => ({ pozycje: [], powodyPrzedzialu: [], komunikaty: [], sciezka: 'rezerwacja', zakres: [], usluga: '', opis: '', uwagi: [] });
  const poz = (r, nazwa, cena, min, extra = {}) => { r.pozycje.push({ nazwa, cena, min, ...extra }); };
  function finish(r) {
    r.cenaMin = r.pozycje.reduce((a, p) => a + p.cena, 0);
    r.cenaMax = r.pozycje.reduce((a, p) => a + (p.cenaMax ?? p.cena), 0);
    r.minuty = r.pozycje.reduce((a, p) => a + (p.min || 0), 0);
    if (r.cenaMax > r.cenaMin && !r.powodyPrzedzialu.length) { // the range rule: never a bare "from X"
      console.error('Przedział bez powodu, pokazuję górną kwotę', r);
      r.cenaMin = r.cenaMax;
    }
    return r;
  }
  function konsultacja(r, c, nazwa, powod) {
    r.sciezka = 'konsultacja'; r.pozycje = [];
    poz(r, nazwa, c.konsultacja.cena, c.konsultacja.min);
    if (powod) r.komunikaty.push({ typ: 'warn', krok: powod.krok, tekst: powod.tekst });
    return r;
  }

  // Cosmetology area price in the treatment's mode (trybObszaru): "tabela" (price per T/TS/TSD),
  // "doplata" (face price + fixed surcharge, returned separately so it shows as its own line),
  // "okolice" (price by number of areas: T = 1, TS = 2, TSD = 3).
  const OKOLICE = { T: '1', TS: '2', TSD: '3' };
  function obszarCena(z, ob) {
    if (z[ob]) return { cena: z[ob].cena, min: z[ob].min };                       // separate areas: eyes, back
    if (z.trybObszaru === 'doplata') { const d = z.doplaty[ob]; return { cena: z.cena + (d?.cena || 0), min: z.min + (d?.min || 0), baza: { cena: z.cena, min: z.min }, doplata: d }; }
    if (z.trybObszaru === 'okolice') { const o = z.okolice[OKOLICE[ob]]; return { cena: o.cena, min: o.min, okolice: Number(OKOLICE[ob]) }; }
    return { cena: z.ceny[ob], min: typeof z.min === 'object' ? z.min[ob] : z.min };
  }
  const konsultacjaZabiegu = (c, z) => z.konsultacja || c.konsultacja;

  // ---------- pricing rules per category (all numbers come from the JSON price list) ----------
  const WYCEN = {
    rzesy(c, w) {
      const r = start();
      if (w.wizyta === 'lifting' || w.wizyta === 'zdjecie') {
        const u = by(c.osobneUslugi, w.wizyta);
        poz(r, u.nazwa, u.cena, u.min);
        r.zakres = ['rzesy', w.wizyta]; r.usluga = u.nazwa; r.opis = u.nazwa + (u.trwalosc ? `, trzyma ${u.trwalosc}` : '');
        return finish(r);
      }
      const v = by(c.warianty, w.gestosc), st = by(c.style, w.styl), granica = c.ustawieniaSalonu.granicaTyg;
      const tyg = { do2: 2, 3: 3, 4: 4, wiecej: 99 }[w.tyg];
      let mode = w.wizyta;
      if (mode === 'uzupelnienie') {
        const why = w.gdzie === 'inne' ? 'Aplikacja z innego studia: liczymy nową aplikację i zdjęcie poprzedniej.'
          : tyg > granica ? `Po ${granica} tygodniach liczymy nową aplikację, bo zostaje za mało rzęs do uzupełnienia.`
            : w.zostalo === 'mniej' ? 'Przy mniej niż połowie rzęs liczymy nową aplikację.' : '';
        if (why) { mode = 'nowa'; r.komunikaty.push({ typ: 'warn', krok: 'wizyta', tekst: why + ' Cena przeliczyła się od razu, nie na wizycie.' }); }
      }
      if (mode === 'uzupelnienie') {
        const key = tyg <= 3 ? 'do3' : 'do4', [p, m] = c.uzupelnienie.ceny[v.id][key];
        const p0 = { nazwa: `Uzupełnienie ${v.nazwa} (${key === 'do3' ? 'do 3' : 'do 4'} tyg.)`, cena: p, min: m };
        if (w.zostalo === 'nie_wiem') {
          p0.cenaMax = v.cena;
          r.powodyPrzedzialu.push(`Uzupełnienie ${zl(p)} albo nowa aplikacja ${zl(v.cena)}, jeśli zostało mniej niż połowa rzęs. Stylistka oceni to przy fotelu.`);
        }
        r.pozycje.push(p0);
      } else {
        poz(r, `Nowa aplikacja ${v.nazwa}`, v.cena, v.min);
        if (w.wizyta === 'uzupelnienie' && w.gdzie === 'inne') { const z = by(c.dodatki, 'zdjecie_przed'); poz(r, z.nazwa, z.cena, z.min); }
      }
      poz(r, `Styl: ${st.nazwa.toLowerCase()} · skręt ${w.skret === 'LM' ? 'L/M' : w.skret}`, 0, 0, { wCenie: true });
      for (const id of w.dodatki) { const d = by(c.dodatki, id); if (d && !d.typ && !d.automatyczny) poz(r, d.nazwa, d.cena, d.min); }
      const skret = by(c.dodatki, 'skretL');
      if (w.skret === 'LM') poz(r, 'Skręt L/M', skret.cena, skret.min);
      else { poz(r, skret.nazwa, 0, 0, { cenaMax: skret.cena, warunkowa: true }); r.powodyPrzedzialu.push(`+${zl(skret.cena)} tylko wtedy, gdy stylistka zaleci skręt L/M. Innych dopłat nie będzie.`); }
      r.zakres = ['rzesy', mode];
      r.usluga = (mode === 'nowa' ? 'Nowa aplikacja rzęs · ' : 'Uzupełnienie rzęs · ') + v.nazwa;
      const dl = { krotsze: 'krótsze niż na mapie', mapa: 'długość jak na mapie', dluzsze: 'dłuższe niż na mapie' }[w.dlugosc];
      r.opis = [v.nazwa, st.nazwa.toLowerCase() + ` (${st.mapaMm.join('-')} mm)`, dl, 'skręt ' + (w.skret === 'LM' ? 'L/M' : w.skret),
        ...w.dodatki.map(id => by(c.dodatki, id)?.nazwa.toLowerCase()).filter(Boolean)].join(' · ');
      return finish(r);
    },

    brwi(c, w) {
      const r = start(), v = by(c.warianty, w.zabieg), styl = by(c.preferencje.styl, w.styl), ton = by(c.preferencje.ton, w.ton);
      const sel = new Set(w.dodatki.filter(id => { const d = by(c.dodatki, id); return d && (!d.dotyczy || d.dotyczy.includes(v.id)); }));
      const pak = c.pakiety.find(p => p.sklad.every(x => x === v.id || sel.has(x)));
      if (pak) {
        const parts = pak.sklad.map(x => by(c.warianty, x) || by(c.dodatki, x)), sumC = parts.reduce((a, x) => a + x.cena, 0), sumM = parts.reduce((a, x) => a + x.min, 0);
        poz(r, pak.nazwa, pak.cena, pak.min);
        pak.sklad.forEach(x => sel.delete(x));
        r.komunikaty.push({ typ: 'ok', krok: 'dodatki', tekst: `Liczymy pakiet: ${pak.nazwa.replace('Pakiet ', '')} ${zl(pak.cena)} · ${dur(pak.min)} zamiast ${zl(sumC)} · ${dur(sumM)}. Oszczędzasz ${zl(sumC - pak.cena)} i ${dur(sumM - pak.min)}.` });
      } else poz(r, v.nazwa, v.cena, v.min);
      for (const id of sel) { const d = by(c.dodatki, id); poz(r, d.nazwa, d.cena, d.min); }
      poz(r, `Styl: ${styl.nazwa.toLowerCase()} · ${ton.nazwa}`, 0, 0, { wCenie: true });
      const kolor = v.koloryzacja || sel.has('henna_rzes') || w.dodatki.includes('henna_rzes');
      r.zakres = ['brwi', v.id, ...(kolor ? ['koloryzacja'] : []), ...(v.laminacja ? ['laminacja'] : []), ...(sel.has('wosk') ? ['wosk'] : []), ...(pak ? pak.sklad : [])];
      const tyg = c.reguly.przypomnienieTyg[v.id];
      if (tyg) r.komunikaty.push({ typ: 'info', krok: 'zabieg', tekst: `Przypomnimy o odświeżeniu po ${tyg} tygodniach.` + (v.laminacja ? ` Laminację można powtórzyć najwcześniej po ${c.reguly.minOdstepLaminacjiTyg} tygodniach.` : '') });
      r.usluga = pak ? pak.nazwa : 'Brwi · ' + v.nazwa;
      r.opis = [pak ? pak.nazwa : v.nazwa, ...[...sel].map(id => by(c.dodatki, id).nazwa.toLowerCase()), 'styl ' + styl.nazwa.toLowerCase(), ton.nazwa].join(' · ');
      return finish(r);
    },

    fryzjer(c, w) {
      const r = start();
      if (w.dla === 'meskie') {
        const s = by(c.meskie, w.meskie);
        poz(r, s.nazwa, s.cena, s.min);
        r.zakres = ['fryzjer', s.id]; r.usluga = 'Fryzjer · ' + s.nazwa; r.opis = s.nazwa + ' (' + s.zawiera.join(', ') + ')';
        return finish(r);
      }
      const s = by(c.warianty, w.usluga), pas = by(c.dlugosc.pasma, w.dlugosc), band = c.dlugosc.mapowanie[w.dlugosc];
      r.zakres = ['fryzjer', s.id, ...(s.koloryzacja ? ['koloryzacja'] : [])];
      r.usluga = 'Fryzjer · ' + s.nazwa; r.opis = `${s.nazwa} · ${pas.nazwa} · włosy ${{ cienkie: 'cienkie', normalne: 'normalne', geste: 'gęste' }[w.gestosc]}`;
      if (s.sciezka === 'konsultacja' || s.wymagaKonsultacji)
        return finish(konsultacja(r, c, `Konsultacja: ${s.nazwa.toLowerCase()}`, { krok: 'usluga', tekst: `${s.nazwa} zaczynamy od bezpłatnej konsultacji (${dur(c.konsultacja.min)}). Orientacyjnie: ${s.orientacyjnie}.` }));
      if (band === 'konsultacja' && !s.bezDlugosci)
        return finish(konsultacja(r, c, 'Konsultacja: włosy poniżej pasa', { krok: 'dlugosc', tekst: 'Włosy poniżej pasa wyceniamy po konsultacji, bo zużycie produktu i czas są zbyt różne, żeby podać kwotę w ciemno.' }));
      if (s.koloryzacja && w.historia.length)
        return finish(konsultacja(r, c, 'Konsultacja koloru', { krok: 'historia', tekst: `Po zaznaczeniu historii nie podamy ceny w ciemno. Zarezerwujesz bezpłatną konsultację (${dur(c.konsultacja.min)}) albo wyślesz 2–3 zdjęcia z tyłu w dziennym świetle i dostaniesz plan z ceną w ${c.wycenaPoZdjeciu.godzin} h.` }));
      const col = band === 'D+' ? 'D' : band, mult = c.stylista[w.stylista].mnoznik;
      const base = Math.round((s.ceny ? s.ceny[col] : s.cena) * mult);
      const min = (typeof s.min === 'object' ? s.min[col] : s.min) + (band === 'D+' && !s.bezDlugosci ? c.minutyDPlus : 0);
      const g = s.gramy ? (typeof s.gramy === 'object' ? s.gramy[col] : s.gramy) : 0;
      poz(r, `${s.nazwa}${s.bezDlugosci ? '' : ', ' + pas.nazwa}${g ? ` (${g} g)` : ''}${mult !== 1 ? ` · ${c.stylista[w.stylista].nazwa.toLowerCase()}` : ''}`, base, min);
      if (g) {
        const est = g * (band === 'D+' && !s.bezDlugosci ? c.mnoznikDPlus : 1) * c.gestosc[w.gestosc], extra = Math.ceil(est - g - 1e-9);
        if (extra > 0) {
          poz(r, `${w.gestosc === 'geste' ? 'Gęste włosy' : 'Długie włosy'}: do ${extra} g farby więcej`, 0, 0, { cenaMax: extra * c.cenaZaGram });
          r.powodyPrzedzialu.push(`W cenie jest ${g} g farby. Przy ${w.gestosc === 'geste' ? 'gęstych' : 'Twojej długości'} włosach szacujemy do ${Math.round(est)} g, każdy gram ponad to ${zl(c.cenaZaGram)}. Więcej nie zapłacisz.`);
        }
      }
      for (const id of w.dodatki) { const d = by(c.dodatki, id); if (d && (!d.dotyczy || r.zakres.some(z => d.dotyczy.includes(z)))) poz(r, d.nazwa, d.cena, d.min); }
      return finish(r);
    },

    kosmetologia(c, w) {
      const r = start(), z = by(c.zabiegi, w.zabieg);
      if (z.wymagaFlagiSalonu && !c.flagiSalonu[z.wymagaFlagiSalonu]) throw new Error('zabieg niedostępny w tym salonie');
      let cena, min, obszarNazwa;
      if (z.warianty) { const war = z.warianty[w.kobido] || z.warianty[0]; cena = war.cena; min = war.min; obszarNazwa = `${war.min} min`; }
      else {
        const o = obszarCena(z, w.obszar), area = by(c.obszary, w.obszar) || by(c.osobneObszary, w.obszar);
        obszarNazwa = area.nazwa.toLowerCase() + (o.okolice ? ` (${o.okolice} ${o.okolice === 1 ? 'okolica' : 'okolice'})` : '');
        if (o.doplata) { // fixed-surcharge mode: face price plus a named surcharge line
          poz(r, `${z.nazwa} · twarz`, o.baza.cena, o.baza.min);
          poz(r, `Dopłata: ${o.doplata.nazwa}`, o.doplata.cena, o.doplata.min);
        } else { cena = o.cena; min = o.min; }
      }
      if (cena !== undefined) poz(r, `${z.nazwa} · ${obszarNazwa}`, cena, min);
      for (const id of w.dodatki) {
        const d = by(c.dodatki, id);
        if (d && d.dotyczy.includes(z.id) && d.ceny[w.obszar] !== undefined) poz(r, d.nazwa, d.ceny[w.obszar], d.min);
      }
      const perVisit = r.pozycje.reduce((a, p) => a + p.cena, 0), n = Number(w.seria);
      if (n > 1) {
        const override = z.seria?.[n] !== undefined && (!z.seriaTylkoObszar || z.seriaTylkoObszar === w.obszar) ? z.seria[n] : null;
        const rabat = c.seriaDomyslnie.rabat[n] ?? 0, suma = override ?? Math.round(perVisit * n * (1 - rabat));
        poz(r, `Kolejne zabiegi serii (${n - 1} × ${zl(perVisit)})`, perVisit * (n - 1), 0);
        poz(r, `Rabat za serię ${Math.round((1 - suma / (perVisit * n)) * 100)}%`, suma - perVisit * n, 0);
        r.seria = { ile: n, suma, zaZabieg: Math.round(suma / n), waznoscMies: c.seriaDomyslnie.waznoscMies };
        r.komunikaty.push({ typ: 'info', krok: 'seria', tekst: `Seria ${n} zabiegów: ${zl(suma)} (${zl(Math.round(suma / n))} za zabieg) płatne z góry przy pierwszej wizycie, ważna ${c.seriaDomyslnie.waznoscMies} miesiące. Odstęp ustali kosmetolożka.` });
      }
      if (w.pierwsza === 'tak') {
        const k = konsultacjaZabiegu(c, z);
        if (k.tryb === 'platna_odliczana') { // paid, then deducted; the treatment is in this booking, so the deduction applies now
          poz(r, 'Konsultacja (pierwsza wizyta)', k.cena, k.min, { dopisek: `odliczymy od zabiegu, jeśli umówisz go w ciągu ${k.odliczanaDni} dni` });
          poz(r, 'Odliczenie konsultacji (zabieg w tej rezerwacji)', -k.cena, 0);
          r.komunikaty.push({ typ: 'info', krok: 'pierwsza', tekst: `Konsultacja przed tym zabiegiem jest płatna: ${zl(k.cena)} · ${dur(k.min)}. Odliczymy ją od zabiegu, jeśli umówisz go w ciągu ${k.odliczanaDni} dni. Tutaj zabieg jest w tej samej rezerwacji, więc kwota konsultacji jest już odjęta.` });
        } else poz(r, 'Konsultacja (pierwsza wizyta)', k.cena, k.min, k.cena ? {} : { dopisek: 'bezpłatna przy zabiegu' });
      }
      const mies = new Date().getMonth() + 1;
      if (z.ostrzezenieSezon && mies >= 5 && mies <= 9) r.komunikaty.push({ typ: 'warn', krok: 'zabieg', tekst: 'Od maja do września kwasy wymagają ochrony SPF 50, kosmetolożka może zaproponować łagodniejszy zabieg.' });
      r.zakres = ['kosmetologia', z.id];
      r.usluga = 'Kosmetologia · ' + z.nazwa + (n > 1 ? ` (seria ${n})` : '');
      r.opis = `${z.nazwa} · ${obszarNazwa}` + r.pozycje.filter(p => p.nazwa.startsWith('Dodatkowa')).map(p => ' · ' + p.nazwa.toLowerCase()).join('');
      return finish(r);
    },
  };

  // ---------- interview: answers stay in memory, only the effect leaves this function ----------
  function ocenWywiad(c, zakres, odp, zgoda) {
    const out = { sciezka: 'rezerwacja', testMin: 0, uwagi: [], wyniki: [] };
    if (!zgoda) { out.sciezka = 'konsultacja'; out.wyniki.push({ typ: 'konsultacja', tekst: 'Bez zgody na odpowiedzi o zdrowiu możesz zarezerwować konsultację. Pytania zada stylistka na miejscu.' }); return out; }
    for (const q of pytania(c, zakres)) {
      if (odp[q.id] !== true) continue;
      let sk = q.skutek;
      if (sk === 'wg_zabiegu') sk = by(c.zabiegi || [], zakres[1])?.ciaza === 'od_II_trymestru' ? 'konsultacja' : 'blokada';
      if (sk === 'blokada' || sk === 'konsultacja') { out.sciezka = worst(out.sciezka, sk); out.wyniki.push({ typ: sk, tekst: q.komunikat }); }
      else if (sk === 'test48h') { out.sciezka = worst(out.sciezka, 'test48h'); out.testMin = c.test.min; out.wyniki.push({ typ: 'test48h', tekst: `${dur(c.test.min)}, ${zl(c.test.cena)}, co najmniej ${c.test.godzinPrzed} h przed zabiegiem. Pokażemy tylko terminy, które to spełniają.` }); }
      else if (q.uwaga) { out.uwagi.push(q.uwaga); out.wyniki.push({ typ: 'uwaga', tekst: q.uwaga }); }
    }
    return out;
  }
  // Questions that apply to the chosen treatment (rules are per treatment, not one global block).
  const pytania = (c, zakres) => c.wywiad.filter(q => (!q.dotyczy || q.dotyczy.some(z => zakres.includes(z))) && (!q.wlaczaSalon || c.ustawieniaSalonu?.[q.wlaczaSalon]));

  // ---------- UI: steps, per-option deltas, sticky price bar ----------
  const ON = 'border: 2px solid #9E1F50; background: #F6EDF1;', OFF = 'border: 1px solid #E4D9DE; background: #FFFFFF;';
  const BASE = 'color: #1E1A1D; font: inherit; cursor: pointer;';
  const META = 'color: #625860';
  const CHECK = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9E1F50" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px; vertical-align: -1px"><path d="M4 12l5 5L20 6"></path></svg>';
  const LAYOUT = {
    tiles2: { wrap: 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px', btn: 'min-height: 52px; padding: 8px 12px; border-radius: 12px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; text-align: left' },
    tiles3: { wrap: 'display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px', btn: 'min-height: 52px; padding: 6px 4px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center' },
    tiles4: { wrap: 'display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px', btn: 'min-height: 52px; padding: 6px 2px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; font-size: 14px' },
    tiles5: { wrap: 'display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px', btn: 'min-height: 48px; padding: 4px 2px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; font-size: 12px' },
    list: { wrap: 'display: flex; flex-direction: column; gap: 6px', btn: 'min-height: 48px; padding: 6px 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; text-align: left' },
    chips: { wrap: 'display: flex; flex-wrap: wrap; gap: 6px', btn: 'min-height: 44px; min-width: 44px; padding: 0 12px; border-radius: 999px; font-size: 14px' },
    cards: { wrap: 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px', btn: 'padding: 10px; border-radius: 14px; display: flex; flex-direction: column; gap: 6px; text-align: left; align-items: flex-start' },
  };
  const BOX = { warn: 'background: #FFF1E0; color: #8A3B12', ok: 'background: #E6F2EC; color: #1F6B47', info: 'background: #EAF0F7; color: #1E1A1D' };
  function deltaText(cur, alt) {
    if (alt.sciezka === 'konsultacja' && cur.sciezka !== 'konsultacja') return 'konsultacja zamiast ceny';
    const dc = alt.cenaMin - cur.cenaMin, dm = alt.minuty - cur.minuty, dx = alt.cenaMax - cur.cenaMax;
    if (!dc && !dm && !dx) return 'bez zmiany ceny';
    if (dc !== dx && dx) return `${zlRange(alt.cenaMin, alt.cenaMax)} · ${dur(alt.minuty)}`; // range changes: show the new total, not two deltas
    const p = v => (v > 0 ? '+' : '−') + Math.abs(v);
    return [dc ? `${p(dc)} zł` : '', dm ? `${p(dm)} min` : ''].filter(Boolean).join(' · ');
  }

  const ready = () => new Promise(res => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', res, { once: true }) : res()));
  // Shared creator layout. Phone: price bar sticks to the bottom of the screen. Desktop (desktop.css, 1024 px+):
  // the bar is the sticky side column, always expanded, with the page's SVG preview above it.
  const LAYOUT_CSS = `
#kreator-bar { position: sticky; bottom: 0; margin-top: auto; padding: 0 8px; z-index: 5; }
@media (max-width: 1023px) { /* phone, collapsed: one row (price · time · Dalej); details only after expanding */
  #kreator-bar .kb-closed { flex-direction: row !important; align-items: center; }
  #kreator-bar .kb-closed [data-bar] { flex: 1; min-width: 0; align-items: center !important; }
  #kreator-bar .kb-closed [data-bar] > span:first-child { font-size: 20px !important; }
  #kreator-bar .kb-closed [data-dalej] { padding: 0 20px; }
}
@media (min-width: 1024px) {
  #kreator-bar { top: 24px; bottom: auto; margin-top: 20px; padding: 0 20px 24px 0; max-height: calc(100vh - 180px); overflow-y: auto; } /* 180 = bar's top before the page scrolls (~157) + gap, so Dalej fits on first load */
  #kreator-bar .kb-card { border-radius: 16px !important; box-shadow: none !important; }
  #kreator-bar #bar-details[hidden] { display: flex !important; }
  #kreator-bar [data-dalej] { position: sticky; bottom: 12px; box-shadow: 0 0 0 12px #1E1A1D; } /* shadow = card background behind the button, hides scrolled lines */
}`;
  async function ui(cfg) {
    document.head.append(Object.assign(document.createElement('style'), { textContent: LAYOUT_CSS }));
    await ready(); // mock.js is deferred: wait for it before reading saved choices
    const root = document.getElementById('kreator'), bar = document.getElementById('kreator-bar');
    let c;
    try { const res = await fetch(`cenniki/${cfg.kat}.json`); if (!res.ok) throw new Error('HTTP ' + res.status); c = await res.json(); }
    catch (e) { root.innerHTML = `<p style="padding: 20px 0; color: #A3262A">Nie udało się wczytać cennika (${esc(e.message)}). Otwórz stronę przez serwer HTTP.</p>`; return; }
    Kreator.selfCheck(cfg.kat, c);
    const steps = cfg.steps(c), wycen = w => WYCEN[cfg.kat](c, w), key = 'kreator_' + cfg.kat;
    const defaults = cfg.defaults(c);
    // restore the last choices (no health data here); anything not offered any more falls back to defaults
    const saved = window.Mock?.get(key, null) || {}, w = structuredClone(defaults);
    for (const s of steps) if (s.key && s.key in saved) {
      let ids;
      try { ids = s.options(c, { ...w, ...saved }).map(o => o.id); } catch { continue; } // step not applicable to the saved choice
      if (s.multi ? Array.isArray(saved[s.key]) : ids.includes(saved[s.key])) w[s.key] = s.multi ? saved[s.key].filter(x => ids.includes(x)) : saved[s.key];
    }
    let open = false;

    function optionMeta(s, o, cur) {
      if (o.meta !== undefined) return (typeof o.meta === 'function' ? o.meta(w, c) : o.meta) ?? ''; // null: no price text (style, tone)
      try {
        if (s.multi) { // an add-on shows its own contribution, whether it is on or off
          const without = { ...w, [s.key]: w[s.key].filter(x => x !== o.id) }, withIt = { ...w, [s.key]: [...without[s.key], o.id] };
          return deltaText(wycen(without), wycen(withIt));
        }
        return w[s.key] === o.id ? '' : deltaText(cur, wycen({ ...w, [s.key]: o.id }));
      } catch { return ''; }
    }
    function render(focus) {
      const r = wycen(w);
      let html = '', inBox = false, n = 0;
      const nav = [];
      for (const s of steps) {
        if (s.show && !s.show(w, c)) continue;
        if (!s.sub && inBox) { html += '</div>'; inBox = false; }
        if (!s.sub) {
          if (n) html += '</section>';
          n++; nav.push({ n, title: s.nav || s.title });
          html += `<section id="krok-${n}" style="padding-top: 20px; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px"><h2 style="margin: 0; font-size: 15px; font-weight: 700">${n}. ${esc(s.title)}</h2>${s.aside ? `<span style="${META}; font-size: 12px; text-align: right">${esc(s.aside)}</span>` : ''}</div>`;
        } else if (!inBox) { html += '<div style="padding: 14px; border-radius: 14px; background: #FAF6F8; display: flex; flex-direction: column; gap: 12px">'; inBox = true; }
        if (s.sub) html += `<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 500">${esc(s.title)}</span>`;
        if (s.html) html += s.html(w, c, r);
        if (s.key) {
          const L = LAYOUT[s.layout];
          html += `<div role="group" aria-label="${esc(s.title)}" style="${L.wrap}">` + s.options(c, w).map(o => {
            const on = s.multi ? w[s.key].includes(o.id) : w[s.key] === o.id, meta = optionMeta(s, o, r);
            const label = `<span style="font-weight: ${on ? 700 : 500}">${on ? CHECK : ''}${esc(o.label)}</span>`;
            const body = s.layout === 'list'
              ? `<span style="display: flex; flex-direction: column">${label}${o.hint ? `<span style="${META}; font-size: 12px">${esc(o.hint)}</span>` : ''}</span><span style="${META}; font-size: 13px; white-space: nowrap; text-align: right">${esc(meta)}</span>`
              : `${o.svg ? o.svg(on) : ''}${label}${o.hint ? `<span style="${META}; font-size: 12px">${esc(o.hint)}</span>` : ''}${meta && s.layout !== 'chips' ? `<span style="${META}; font-size: 12px">${esc(meta)}</span>` : ''}${meta && s.layout === 'chips' ? ` <span style="${META}; font-size: 12px">${esc(meta)}</span>` : ''}`;
            return `<button type="button" aria-pressed="${on}" data-k="${s.key}" data-v="${esc(o.id)}" style="${on ? ON : OFF} ${BASE} ${L.btn}">${body}</button>`;
          }).join('') + '</div>';
        }
        if (s.after) html += s.after(w, c, r);
        if (s.note) { const t = typeof s.note === 'function' ? s.note(w, c, r) : s.note; if (t) html += `<span style="${META}; font-size: 12px; line-height: 1.45">${esc(t)}</span>`; }
        for (const k of r.komunikaty.filter(k => k.krok === (s.krok || s.key))) html += `<p role="status" style="margin: 0; padding: 10px 12px; border-radius: 10px; ${BOX[k.typ] || BOX.info}; font-size: 13px; line-height: 1.45">${esc(k.tekst)}</p>`;
        if (s.sub) html += '</div>';
      }
      if (inBox) html += '</div>';
      if (n) html += '</section>';
      html += `<p style="margin: 18px 0 8px; ${META}; font-size: 12px; line-height: 1.45">Ceny brutto, przykładowe z publicznych cenników polskich salonów (źródła w raporcie). Studio ustawia własne w panelu. Cennik obowiązuje od ${esc(c.obowiazujeOd)}.</p>`;
      root.innerHTML = html;
      document.getElementById('kroki').innerHTML = nav.map(x => `<a href="#krok-${x.n}" style="display: flex; flex-direction: column; gap: 4px; min-height: 44px; font-size: 12px; color: #1E1A1D; text-decoration: none"><span style="height: 4px; border-radius: 2px; background: #9E1F50"></span>${esc(x.title)}</a>`).join('')
        + `<span style="display: flex; flex-direction: column; gap: 4px; min-height: 44px; font-size: 12px; color: #625860"><span style="height: 4px; border-radius: 2px; background: #E4D9DE"></span>Wywiad</span>`;
      document.getElementById('kroki').style.gridTemplateColumns = `repeat(${nav.length + 1}, minmax(0, 1fr))`;
      renderBar(r);
      if (focus) root.querySelector(`button[data-k="${focus[0]}"][data-v="${CSS.escape(focus[1])}"]`)?.focus();
      window.Mock?.set(key, w);
      return r;
    }
    function renderBar(r) {
      const kons = r.sciezka === 'konsultacja';
      const price = kons ? `Konsultacja ${zl(r.cenaMin)}` : zlRange(r.cenaMin, r.cenaMax);
      const lines = r.pozycje.map(p => `<div style="display: flex; justify-content: space-between; gap: 12px; font-size: 14px"><span style="color: #E9DEE3">${esc(p.nazwa)}${p.dopisek ? `<br><span style="font-size: 12px">${esc(p.dopisek)}</span>` : ''}</span><span style="white-space: nowrap">${p.wCenie ? 'w cenie' : p.cenaMax !== undefined && p.cenaMax !== p.cena ? `${p.cena}–${p.cenaMax} zł` : zl(p.cena) + (p.min ? ' · ' + dur(p.min) : '')}</span></div>`).join('');
      const why = r.powodyPrzedzialu.map(t => `<span style="color: #E9DEE3; font-size: 12px; line-height: 1.45">Dlaczego widełki: ${esc(t)}</span>`).join('');
      const seria = r.seria ? `<span style="color: #E9DEE3; font-size: 12px; line-height: 1.45">Za całą serię ${r.seria.ile} zabiegów (${zl(r.seria.zaZabieg)} za zabieg). Czas dotyczy jednej wizyty.</span>` : '';
      const preview = cfg.preview ? `<div class="d-only" style="margin-bottom: 12px; padding: 16px; border-radius: 16px; background: #FAF6F8; text-align: center">${cfg.preview(w, c, r)}</div>` : '';
      bar.innerHTML = `${preview}<div class="kb-card${open ? '' : ' kb-closed'}" style="padding: 12px 16px; border-radius: 16px 16px 0 0; background: #1E1A1D; color: #FFFFFF; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 -6px 20px rgba(30,26,29,.18)">
        <button type="button" data-bar aria-expanded="${open}" aria-controls="bar-details" style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 0; border: 0; background: transparent; color: #FFFFFF; font: inherit; cursor: pointer; min-height: 44px; text-align: left">
          <span style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 24px; font-weight: 700">${esc(price)}</span>
          <span style="color: #E9DEE3; font-size: 14px; white-space: nowrap">ok. ${dur(r.minuty)} <span class="m-only" aria-hidden="true">${open ? '▾' : '▴'}</span></span>
        </button>
        <div id="bar-details" ${open ? '' : 'hidden'} style="display: flex; flex-direction: column; gap: 8px">${lines}<div style="height: 1px; background: #4A4247"></div>${why}${seria}</div>
        <button type="button" data-dalej style="min-height: 48px; border-radius: 12px; border: 0; background: #FFFFFF; color: #1E1A1D; font: inherit; font-weight: 700; cursor: pointer">${open ? esc(cfg.dalej(r, c)) : `<span class="d-only">${esc(cfg.dalej(r, c))}</span><span class="m-only">Dalej</span>`}</button>
      </div>`;
    }
    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      const s = steps.find(x => x.key === b.dataset.k), id = b.dataset.v;
      if (s.multi) w[s.key] = w[s.key].includes(id) ? w[s.key].filter(x => x !== id) : [...w[s.key], id];
      else w[s.key] = id;
      s.onChange?.(w, c);
      render([s.key, id]);
    });
    bar.addEventListener('click', e => {
      if (e.target.closest('[data-bar]')) { open = !open; renderBar(wycen(w)); bar.querySelector('[data-bar]').focus(); return; }
      if (!e.target.closest('[data-dalej]')) return;
      const r = wycen(w);
      window.Mock?.set('booking', {
        kategoria: cfg.nazwa, usluga: r.usluga, opis: r.opis, cena: r.cenaMax, cenaMin: r.cenaMin, cenaMax: r.cenaMax,
        czas: r.minuty, czasTekst: dur(r.minuty), studio: '[Studio 1]', powodPrzedzialu: r.powodyPrzedzialu.join(' '),
        pozycje: r.pozycje.map(p => ({ nazwa: p.nazwa, cena: p.cenaMax ?? p.cena, cenaMin: p.cena, min: p.min, ...(p.cenaMax > p.cena ? { warunkowa: true } : {}), ...(p.dopisek ? { dopisek: p.dopisek } : {}) })), sciezka: r.sciezka,
        testMin: 0, uwagi: r.uwagi, seria: r.seria || null, zakres: r.zakres, kat: cfg.kat,
      });
      location.href = 'wywiad.html?kat=' + cfg.kat;
    });
    document.getElementById('odNowa').addEventListener('click', () => {
      Object.assign(w, structuredClone(defaults)); open = false; render(); window.Mock?.toast('Zaczynamy od nowa');
    });
    render();
  }

  // ---------- self-checks: the worked examples from the research report ----------
  const SELF = {
    rzesy: c => { const r = WYCEN.rzesy(c, { wizyta: 'nowa', tyg: '3', gdzie: 'u_nas', zostalo: 'ponad', styl: 'kocie_oko', gestosc: '3D', dlugosc: 'mapa', skret: 'CC', dodatki: ['kim', 'kolor'] });
      console.assert(r.cenaMin === 240 && r.cenaMax === 260 && r.minuty === 135 && r.powodyPrzedzialu.length === 1, 'rzęsy: 3D kocie oko Kim brązowe = 240–260 zł, 135 min', r);
      const u = WYCEN.rzesy(c, { wizyta: 'uzupelnienie', tyg: 'wiecej', gdzie: 'u_nas', zostalo: 'ponad', styl: 'naturalny', gestosc: '3D', dlugosc: 'mapa', skret: 'LM', dodatki: [] });
      console.assert(u.pozycje[0].nazwa.startsWith('Nowa aplikacja') && u.cenaMin === u.cenaMax, 'rzęsy: ponad granicę tygodni = nowa aplikacja', u); },
    brwi: c => { const a = WYCEN.brwi(c, { styl: 'lagodny_luk', ton: 'cieply_braz', zabieg: 'laminacja', dodatki: ['henna_rzes'] });
      console.assert(a.cenaMin === 180 && a.cenaMax === 180 && a.minuty === 70, 'brwi: laminacja + henna rzęs = 180 zł, 70 min', a);
      const b = WYCEN.brwi(c, { styl: 'laminowane_fluffy', ton: 'cieply_braz', zabieg: 'laminacja', dodatki: ['lifting_rzes'] });
      console.assert(b.cenaMin === 240 && b.minuty === 90 && b.pozycje[0].nazwa.includes('LAMI'), 'brwi: laminacja + lifting = pakiet 240 zł, 90 min', b); },
    fryzjer: c => { const r = WYCEN.fryzjer(c, { dla: 'damskie', meskie: 'meskie', usluga: 'kolor', dlugosc: 'ramiona', gestosc: 'geste', historia: [], dodatki: ['plex'], stylista: 'fryzjer' });
      console.assert(r.cenaMin === 520 && r.cenaMax === 565 && r.minuty === 125 && r.powodyPrzedzialu.length === 1, 'fryzjer: kolor do ramion, gęste, plex = 520–565 zł, 125 min', r);
      const k = WYCEN.fryzjer(c, { dla: 'damskie', meskie: 'meskie', usluga: 'kolor', dlugosc: 'ramiona', gestosc: 'normalne', historia: ['henna'], dodatki: [], stylista: 'fryzjer' });
      console.assert(k.sciezka === 'konsultacja' && k.cenaMax === 0, 'fryzjer: henna = konsultacja zamiast ceny', k); },
    kosmetologia: c => { const base = { zabieg: 'kwas_migdalowy', obszar: 'TS', kobido: '0', dodatki: ['warstwa_kwasu'], pierwsza: 'nie' };
      const r = WYCEN.kosmetologia(c, { ...base, seria: '1' }), s = WYCEN.kosmetologia(c, { ...base, seria: '5' });
      console.assert(r.cenaMin === 420 && r.minuty === 70, 'kosmetologia: kwas migdałowy T+S + warstwa = 420 zł, 70 min', r);
      console.assert(s.cenaMin === 1890 && s.seria.suma === 1890 && s.minuty === 70, 'kosmetologia: seria 5 = 1890 zł', s);
      console.assert(!c.zabiegi.some(z => c.wykluczone.some(x => z.nazwa.toLowerCase().includes(x.toLowerCase()))), 'kosmetologia: brak zabiegów wykluczonych');
      // one treatment per area mode: table (acid), fixed surcharge (RF), number of areas (hydrogen cleansing)
      const one = (zabieg, obszar, extra = {}) => WYCEN.kosmetologia(c, { zabieg, obszar, kobido: '0', dodatki: [], seria: '1', pierwsza: 'nie', ...extra });
      const tab = one('kwas_migdalowy', 'TSD'), dop = one('rf', 'TSD'), oko = one('wodorowe', 'TS');
      console.assert(tab.cenaMin === 410 && tab.minuty === 75, 'kosmetologia: tryb tabela, kwas TSD = 410 zł', tab);
      console.assert(dop.cenaMin === 350 && dop.minuty === 70 && dop.pozycje[1].nazwa === 'Dopłata: szyja i dekolt' && dop.pozycje[1].cena === 100, 'kosmetologia: tryb dopłata, RF twarz 250 + szyja i dekolt 100 = 350 zł', dop);
      console.assert(oko.cenaMin === 280 && oko.minuty === 60 && oko.pozycje[0].nazwa.includes('2 okolice'), 'kosmetologia: tryb okolice, wodorowe 2 okolice = 280 zł', oko);
      // paid consultation deducted from the treatment (mikroigłowa) vs free consultation (others)
      const pk = one('mikroiglowa', 'T', { pierwsza: 'tak' }), fk = one('kwas_migdalowy', 'T', { pierwsza: 'tak' });
      console.assert(pk.cenaMin === 450 && pk.minuty === 105 && pk.pozycje.some(p => p.cena === 199 && p.dopisek?.includes('30 dni')) && pk.pozycje.some(p => p.cena === -199), 'kosmetologia: płatna konsultacja 199 zł odliczona od zabiegu', pk);
      console.assert(fk.cenaMin === 300 && fk.pozycje.some(p => p.nazwa.startsWith('Konsultacja') && p.cena === 0), 'kosmetologia: bezpłatna konsultacja przy pozostałych zabiegach', fk); },
  };
  window.Kreator = { ui, wycen: WYCEN, obszarCena, konsultacjaZabiegu, ocenWywiad, pytania, zl, dur, zlRange, esc, worst, selfCheck: (kat, c) => SELF[kat]?.(c) };
  console.assert(dur(125) === '2 h 5 min' && zl(-210) === '−210 zł' && zlRange(240, 260) === '240–260 zł' && worst('test48h', 'konsultacja') === 'konsultacja', 'kreator.js format');
})();
