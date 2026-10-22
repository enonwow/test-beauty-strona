// Barcodes for the Magazyn delivery scanner: the back camera read by the browser's BarcodeDetector (Chrome on Android),
// else ZXing from the CDN (iPhone, desktop), loaded only when the camera is switched on. The picture never leaves the device.
const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
const wczytaj = src => new Promise((ok, err) => {
  const s = Object.assign(document.createElement('script'), { src, crossOrigin: 'anonymous' });
  s.onload = ok; s.onerror = () => err(new Error('Nie udało się wczytać czytnika kodów.')); document.head.append(s);
});

// Plays the back camera in <video> and calls onKod(text) for every code it reads. Returns stop().
export async function start(video, onKod) {
  const strumien = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  Object.assign(video, { srcObject: strumien, muted: true, playsInline: true }); await video.play();
  let koniec;
  if ('BarcodeDetector' in window) {
    const chce = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'data_matrix'], ma = await BarcodeDetector.getSupportedFormats();
    const det = new BarcodeDetector({ formats: chce.filter(f => ma.includes(f)) });
    const t = setInterval(() => det.detect(video).then(r => r.forEach(c => onKod(c.rawValue))).catch(() => {}), 250);
    koniec = () => clearInterval(t);
  } else {
    if (!window.ZXingBrowser) await wczytaj(ZXING);
    const c = await new window.ZXingBrowser.BrowserMultiFormatReader().decodeFromVideoElement(video, r => { if (r) onKod(r.getText()); });
    koniec = () => c.stop();
  }
  return () => { koniec(); strumien.getTracks().forEach(t => t.stop()); video.srcObject = null; };
}

// A GS1 code (DataMatrix, GS1-128) carries the product (01), the expiry date (17, YYMMDD) and the batch (10);
// a plain EAN or UPC comes back as the code alone. Day 00 in GS1 means the last day of the month.
export function gs1(raw) {
  let s = String(raw || '').trim().replace(/^\][A-Za-z]\d/, '');
  if (!/^01\d{14}/.test(s)) return { kod: s };
  const GS = String.fromCharCode(29), out = {};
  while (s.length) {
    if (s[0] === GS) { s = s.slice(1); continue; }
    const ai = s.slice(0, 2);
    if (ai === '01') { const g = s.slice(2, 16); out.kod = g[0] === '0' ? g.slice(1) : g; s = s.slice(16); } // GTIN-14 with a leading 0 is the EAN-13
    else if (['11', '13', '15', '17'].includes(ai)) {
      const [r, m, d] = [s.slice(2, 4), s.slice(4, 6), s.slice(6, 8)];
      if (ai === '17') out.wazne = `20${r}-${m}-${d === '00' ? String(new Date(2000 + +r, +m, 0).getDate()) : d}`;
      s = s.slice(8);
    } else if (ai === '10' || ai === '21') {
      const k = s.indexOf(GS), v = k < 0 ? s.slice(2) : s.slice(2, k);
      if (ai === '10') out.partia = v;
      s = k < 0 ? '' : s.slice(k + 1);
    } else break;
  }
  return out;
}

// the same product whatever form the code came in (UPC-A vs EAN-13, GTIN-14)
export const ten = (a, b) => String(a || '').replace(/^0+/, '') === String(b || '').replace(/^0+/, '') && !!a;

console.assert(JSON.stringify(gs1('01059012341234571727123110LOT26B')) === '{"kod":"5901234123457","wazne":"2027-12-31","partia":"LOT26B"}'
  && JSON.stringify(gs1('0105901234123457' + '10L1' + String.fromCharCode(29) + '17280200')) === '{"kod":"5901234123457","partia":"L1","wazne":"2028-02-29"}'
  && gs1('2001000000012').kod === '2001000000012' && ten('0036000291452', '036000291452'), 'kod-kreskowy gs1');
