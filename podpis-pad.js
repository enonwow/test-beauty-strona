// Signature pad shared by podpis.html and podpis-dokument.html: finger, mouse or stylus (pointer events).
// Strokes keep points as fractions of the pad, so resizing or rotating the tablet redraws the same signature.
// Stylus: pressure sets the line width, every coalesced sample is drawn, and once a pen is seen a resting palm (touch) is ignored.
export const width = p => (p.t === 'pen' ? 0.8 + p.p * 3.4 : 2.5);
console.assert(width({ t: 'pen', p: 0 }) < width({ t: 'pen', p: 1 }) && width({ t: 'mouse', p: 0.5 }) === 2.5, 'podpis-pad width');

export function createPad(cv, { onChange = () => {}, onPen = () => {} } = {}) {
  const ctx = cv.getContext('2d'), strokes = [];
  let drawing = false, penSeen = false;
  const box = () => cv.getBoundingClientRect();
  const seg = (a, b, c = ctx, w = box().width, h = box().height) => {
    c.lineWidth = (width(a) + width(b)) / 2;
    c.beginPath(); c.moveTo(a.x * w, a.y * h); c.lineTo(b.x * w + (a === b ? 0.01 : 0), b.y * h); c.stroke();
  };
  const paint = (c, w, h) => strokes.forEach(st => st.forEach((p, i) => seg(st[i - 1] || p, p, c, w, h)));
  const redraw = () => { ctx.clearRect(0, 0, cv.width, cv.height); paint(ctx); };
  function size() {
    const r = box(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E1A1D';
    redraw();
  }
  // drawn length in CSS px: a single tap is not a signature
  const travel = () => { const r = box(); return strokes.reduce((t, st) => t + st.reduce((a, p, i) => a + (i ? Math.hypot((p.x - st[i - 1].x) * r.width, (p.y - st[i - 1].y) * r.height) : 0), 0), 0); };
  const pt = e => { const r = box(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, p: e.pressure || 0.5, t: e.pointerType }; };
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen' && !penSeen) { penSeen = true; onPen(); }
    if (penSeen && e.pointerType === 'touch') return; // palm rejection
    drawing = true; cv.setPointerCapture(e.pointerId);
    const p = pt(e); strokes.push([p]); seg(p, p);
  });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return;
    const st = strokes[strokes.length - 1];
    (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(ev => { const p = pt(ev); seg(st[st.length - 1], p); st.push(p); });
  });
  const end = () => { if (drawing) { drawing = false; onChange(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  window.addEventListener('resize', size);
  size();

  // signature cropped to its ink, drawn at 2x, with an optional caption line above it (rendered here, so Polish letters work in the PDF);
  // the caption goes above, so a stamp standing on a document's line never covers the text printed under that line
  function toPNG(caption = '') {
    const r = box(), xs = strokes.flat().map(p => p.x * r.width), ys = strokes.flat().map(p => p.y * r.height);
    if (!xs.length) return null;
    const m = 8, x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m, w0 = Math.max(...xs) - x0 + m, h = Math.max(...ys) - y0 + m, k = 2;
    // the stamp is shrunk to about a third of the page, so the caption scales with the signature to stay readable
    const fs = caption ? Math.max(18, w0 / 12) : 0, cap = fs * 1.5, font = `${fs}px 'DM Sans', system-ui, sans-serif`;
    const mc = document.createElement('canvas').getContext('2d'); mc.font = font;
    const w = Math.max(w0, caption ? mc.measureText(caption).width + 4 : 0);
    const out = document.createElement('canvas'); out.width = Math.ceil(w * k); out.height = Math.ceil((h + cap) * k);
    const c = out.getContext('2d'); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#1E1A1D';
    if (caption) { c.fillStyle = '#625860'; c.font = font; c.fillText(caption, 2, fs * 1.1); }
    c.save(); c.translate(-x0, cap - y0); paint(c, r.width, r.height); c.restore();
    // ink: where the bottom of the signature ink is, as a fraction of the stamp height
    return { url: out.toDataURL('image/png'), w: out.width / k, h: out.height / k, ink: (cap + h - m) / (h + cap) };
  }

  return {
    size, toPNG, travel,
    get strokes() { return strokes.length; },
    get penSeen() { return penSeen; },
    undo() { strokes.pop(); redraw(); onChange(); },
    clear() { strokes.length = 0; redraw(); onChange(); }
  };
}
