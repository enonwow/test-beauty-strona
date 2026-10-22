// Hair colour try-on on a still photo: a hair mask (MediaPipe ImageSegmenter for the client's selfie, a saved PNG for the
// stock photos) and paint(), which recolours the hair on a canvas by technique. Everything runs in the browser;
// a client's photo is never sent anywhere or stored. Used by fryzjer.html.
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite';
const MIN_HAIR = 0.004; // share of the photo; below it we assume there is no person with visible hair

let loading;
// Lazy: the library and the model (~1 MB) are fetched only when the first selfie is chosen.
const segmenter = () => (loading ||= (async () => {
  const { FilesetResolver, ImageSegmenter } = await import(`${MP}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
  return ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL }, runningMode: 'IMAGE', outputConfidenceMasks: true });
})().catch(e => { loading = null; throw e; })); // a failed load can be retried

export const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
export const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

const toCanvas = (src, w, h) => {
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
  cv.getContext('2d', { willReadFrequently: true }).drawImage(src, 0, 0, w, h); // its pixels are read back
  return cv;
};
// Photo file -> canvas no larger than `max` px, EXIF rotation applied.
export async function loadPhoto(file, max = 1000) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = toCanvas(bmp, Math.round(bmp.width * k), Math.round(bmp.height * k));
  bmp.close();
  return cv;
}
// Image URL -> canvas of w x h (not decode(): it can stall in a background tab).
export async function loadUrl(src, w, h) {
  const img = new Image();
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = src; });
  return toCanvas(img, w, h);
}

function blur(a, w, h, r) { // separable box blur, soft mask edge
  const t = new Float32Array(a.length);
  for (const [src, dst, n, len, step, stride] of [[a, t, h, w, 1, w], [t, a, w, h, w, 1]])
    for (let l = 0; l < n; l++) {
      const o = l * stride;
      for (let i = 0; i < len; i++) {
        let s = 0, c = 0;
        for (let j = Math.max(0, i - r); j <= Math.min(len - 1, i + r); j++) { s += src[o + j * step]; c++; }
        dst[o + i * step] = s / c;
      }
    }
}

// Photo pixels + mask (0..1 per pixel) -> { base, mask, w, h, lm, sd, box, t0, t1 } or null when there is no hair.
// lm = mean hair luminance, box = [x0, y0, x1, y1], t0..t1 = rows where the hair starts (roots) and ends (tips).
function analyze(canvas, mask) {
  const { width: w, height: h } = canvas, base = canvas.getContext('2d').getImageData(0, 0, w, h), d = base.data, rows = new Uint32Array(h);
  let n = 0, s = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] > 0.5) {
    const x = i % w, y = (i - x) / w;
    n++; rows[y]++; s += lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (n / mask.length < MIN_HAIR) return null;
  const at = q => { let c = 0, y = 0; while (y < h && (c += rows[y]) < n * q) y++; return y; }; // row below which share q of the hair lies
  let v = 0; // spread of the hair's brightness in stops, so strand texture is shown at the same strength for any photo
  for (let i = 0; i < mask.length; i++) if (mask[i] > 0.5) v += Math.log2(Math.max(0.01, lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])) / (s / n)) ** 2;
  return { base, mask, w, h, lm: s / n, sd: Math.sqrt(v / n), box: [x0, y0, x1, y1], t0: at(0.02), t1: at(0.98) };
}

// Selfie canvas -> hair (null: nobody with hair in the photo). Loads MediaPipe on first use.
export async function prepare(canvas) {
  const { width: w, height: h } = canvas, seg = await segmenter(), res = seg.segment(canvas);
  let conf;
  try {
    const m = res.confidenceMasks.at(-1); // two classes: background, hair; hair is last
    const src = m.getAsFloat32Array();
    conf = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) conf[y * w + x] = src[Math.min(m.height - 1, Math.floor(y * m.height / h)) * m.width + Math.min(m.width - 1, Math.floor(x * m.width / w))];
  } finally { res.close(); }
  for (let i = 0; i < conf.length; i++) { const t = Math.min(1, Math.max(0, (conf[i] - 0.3) / 0.4)); conf[i] = t * t * (3 - 2 * t); } // smoothstep: drop weak halos
  blur(conf, w, h, Math.max(1, Math.round(w / 300)));
  return analyze(canvas, conf);
}

// Stock photo canvas + its saved grey-scale mask PNG (made once with prepare()) -> hair, without loading MediaPipe.
export async function zMaski(canvas, maskUrl) {
  const { width: w, height: h } = canvas, px = (await loadUrl(maskUrl, w, h)).getContext('2d').getImageData(0, 0, w, h).data, mask = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4] / 255;
  return analyze(canvas, mask);
}

// How much lighter the swatch is than the hair in the photo (0..1). Large values mean bleaching, not just colouring.
export const lighterBy = (hair, hex) => lum(...hexRgb(hex)) - hair.lm;

// ---- techniques: how much of the swatch each hair pixel gets (0 = natural, 1 = full), by position along the hair ----
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const noise = (x, y) => { // value noise, 0..1
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
};
// Vertical, slightly wavy streaks of the given width (px); lo..hi sets how much of the hair they cover.
const streak = (x, y, per, lo, hi) => smooth(lo, hi, noise(x / per + 1.6 * noise(y / (per * 10), 7), y / (per * 16)));

export const TECHNIKI = {
  solid: { nazwa: 'kolor jednolity', cover: () => 1 },
  root: { nazwa: 'odrost: ciemniejsza nasada', cover: () => 1, rootDark: 0.5 },
  ombre: { nazwa: 'ombre: jaśniej ku końcom', cover: t => smooth(0.28, 0.9, t) },
  balayage: { nazwa: 'balayage: ręcznie malowane pasma', cover: (t, x, y, u) => { // each streak starts at its own height and the tips are mostly light, like brush strokes
    const s = streak(x, y, u * 0.9, 0.4, 0.6), from = 0.15 + 0.35 * noise(x / (u * 1.3), 3.1);
    return Math.max(smooth(from, from + 0.4, t) * s, smooth(0.5, 0.95, t) * (0.65 + 0.35 * s));
  } },
  highlights: { nazwa: 'cienkie refleksy na całej długości', cover: (t, x, y, u) => 0.85 * streak(x, y, u * 0.22, 0.56, 0.7) * smooth(0.03, 0.15, t) * (0.7 + 0.3 * t) },
};

// Keeps the hair's own light, gloss and strand texture: each pixel's brightness relative to the mean hair brightness
// (a log ratio, so it works for any starting colour) picks a point between a warm, deeper shadow tone, the swatch itself
// and a lighter sheen. strength 0..1 blends back to the natural hair; 0 = the untouched photo.
export function paint(canvas, { base, mask, lm, sd, box, t0, t1 }, hex, strength, tech = 'solid') {
  const T = TECHNIKI[tech], rgb = hexRgb(hex), t = rgb.map(v => v / 255), lt = lum(...rgb), src = base.data, w = base.width;
  const shadow = t.map(v => Math.pow(v, 1.35) * 0.4), sheen = t.map(v => v + (1 - v) * (0.25 + 0.4 * lt)); // shadows get deeper and more saturated, not olive
  const out = new ImageData(new Uint8ClampedArray(src), w, base.height), o = out.data, per = Math.max(6, (box[2] - box[0]) / 16), span = Math.max(1, t1 - t0);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] * strength < 0.004) continue;
    const x = i % w, y = (i - x) / w, pos = Math.min(1, Math.max(0, (y - t0) / span)), a = mask[i] * strength * T.cover(pos, x, y, per);
    if (a < 0.004) continue;
    const p = i * 4, u = Math.min(1, Math.max(-1, Math.log2(Math.max(0.01, lum(src[p], src[p + 1], src[p + 2])) / lm) / (2.2 * Math.max(0.15, sd)))),
      root = T.rootDark ? 1 - T.rootDark * (1 - smooth(0.05, 0.32, pos)) : 1; // darker roots
    for (let c = 0; c < 3; c++) {
      const v = (u < 0 ? t[c] + (shadow[c] - t[c]) * -u : t[c] + (sheen[c] - t[c]) * u * 0.8) * root * 255;
      o[p + c] = src[p + c] + (v - src[p + c]) * a;
    }
  }
  canvas.getContext('2d').putImageData(out, 0, 0);
}

// Small photo of hair strands in the given shade (swatch thumbnail): the densest hair window of the photo, painted solid.
export function probka(hair, hex, w = 160, h = 100) {
  if (!hair.okno) { // best window: most hair, searched on a coarse grid
    let best = -1;
    for (let y = 0; y + h <= hair.h; y += 20) for (let x = 0; x + w <= hair.w; x += 20) {
      let s = 0;
      for (let j = 0; j < h; j += 10) for (let i = 0; i < w; i += 10) s += hair.mask[(y + j) * hair.w + x + i];
      if (s > best) { best = s; hair.okno = { x, y }; }
    }
  }
  const { x, y } = hair.okno, mask = new Float32Array(w * h), base = new ImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    mask[j * w + i] = hair.mask[(y + j) * hair.w + x + i];
    base.data.set(hair.base.data.subarray(((y + j) * hair.w + x + i) * 4, ((y + j) * hair.w + x + i) * 4 + 4), (j * w + i) * 4);
  }
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
  paint(cv, { base, mask, lm: hair.lm, sd: hair.sd, box: [0, 0, w, h], t0: 0, t1: h }, hex, 1);
  return cv;
}
