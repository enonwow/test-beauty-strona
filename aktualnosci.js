// Beauty headlines for aktualnosci.html and the start page block (design/SPEC-NEWS-RSS.md).
// Live data: aktualnosci.json written every 4 h by the GitHub Actions build (GitHub Pages), else /api/news (Netlify function).
// Locally neither exists, so it falls back to the sample file.
export const TEMATY = { paznokcie: 'Paznokcie', rzesy: 'Rzęsy', brwi: 'Brwi', wlosy: 'Włosy', pielegnacja: 'Pielęgnacja', makijaz: 'Makijaż', zabiegi: 'Zabiegi' };

export async function wczytajNewsy() {
  for (const url of ['aktualnosci.json', '/api/news']) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) continue;
      const d = await r.json();
      if (Array.isArray(d.items)) return { ...d, przyklad: false };
    } catch { /* try the next source */ }
  }
  const d = await (await fetch('aktualnosci-przyklad.json')).json();
  return { ...d, przyklad: true };
}

export function kiedy(iso, now = Date.now()) {
  const min = Math.round((now - Date.parse(iso)) / 60000);
  if (min < 60) return `${Math.max(1, min)} min temu`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h temu`;
  const dni = Math.round(min / 1440);
  return dni === 1 ? 'wczoraj' : `${dni} dni temu`;
}

// our own photos (zdjecia/, see ZRODLA.md) by topic, in this order of priority; the publishers' photos are never copied
const FOTO_TEMAT = [['paznokcie', 'kat-paznokcie'], ['rzesy', 'kat-rzesy'], ['brwi', 'kat-brwi'], ['wlosy', 'kat-fryzjer'], ['pielegnacja', 'kat-kosmetyka'], ['makijaz', 'oczy-1'], ['zabiegi', 'kosmetologia-1']];
// Card built from text nodes only: feed content never goes in as HTML. Only https links are kept. foto: a topic thumbnail on the left.
export function karta(it, { lead = true, foto = false } = {}) {
  let url; try { url = new URL(it.url); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const a = document.createElement('a');
  a.className = 'nw'; a.href = url.href; a.target = '_blank'; a.rel = 'noopener';
  const meta = document.createElement('span'); meta.className = 'nw-m';
  meta.textContent = `${it.source} · ${kiedy(it.published)}${it.topics?.length ? ' · ' + it.topics.map(t => TEMATY[t] || t).join(', ') : ''}`;
  const t = document.createElement('b'); t.className = 'nw-t'; t.textContent = it.title;
  a.append(meta, t);
  if (lead && it.lead) { const p = document.createElement('span'); p.className = 'nw-l'; p.textContent = it.lead; a.append(p); }
  const go = document.createElement('span'); go.className = 'nw-go'; go.textContent = `Czytaj na ${url.hostname.replace(/^www\./, '')} ↗`;
  a.append(go);
  if (foto) {
    const tx = document.createElement('span'); tx.className = 'nw-tx'; tx.append(...a.childNodes);
    const img = document.createElement('img'); img.className = 'nw-f'; img.alt = ''; img.loading = 'lazy'; img.width = img.height = 112;
    img.src = `zdjecia/${(FOTO_TEMAT.find(([t]) => it.topics?.includes(t)) || FOTO_TEMAT[4])[1]}.jpg`;
    a.classList.add('f'); a.append(img, tx);
  }
  a.setAttribute('aria-label', `${it.title}. ${it.source}, ${kiedy(it.published)}. Otwiera się w nowej karcie.`);
  return a;
}

console.assert(kiedy('2026-10-19T16:00:00Z', Date.parse('2026-10-19T18:00:00Z')) === '2 h temu' && kiedy('2026-10-18T10:00:00Z', Date.parse('2026-10-19T10:00:00Z')) === 'wczoraj', 'aktualnosci.js kiedy');
