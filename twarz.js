// Photo try-on shell shared by rzesy.html, brwi.html and fryzjer.html, plus MediaPipe Face Landmarker for lashes and brows
// (loaded only when a photo is picked). The photo stays in page memory: no upload, no localStorage.
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MAX_SIDE = 1600; // phone photos are 12 MP+; this is plenty for eyes and brows
const MIN_EYE_PX = 28; // narrower eye = lashes a few pixels long, not worth drawing

// Face mesh indices, each list from the inner (nose) corner outwards.
const LM = {
  lidR: [133, 173, 157, 158, 159, 160, 161, 246, 33], lidL: [362, 398, 384, 385, 386, 387, 388, 466, 263],
  browTopR: [107, 66, 105, 63, 70], browBotR: [55, 65, 52, 53, 46],
  browTopL: [336, 296, 334, 293, 300], browBotL: [285, 295, 282, 283, 276],
};

let landmarkerPromise = null;
const landmarker = () => landmarkerPromise ??= (async () => {
  const { FilesetResolver, FaceLandmarker } = await import(`${MP}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
  // CPU like paznokcie.html: one still photo is fast enough and the GPU delegate is flaky on some machines
  return FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 2 });
})().catch(e => { landmarkerPromise = null; throw e; }); // allow a retry after a network error

// an error whose message is safe to show the client as is
export const blad = msg => Object.assign(new Error(msg), { pl: true });
const fail = blad;

// file -> { photo: canvas, eyes: [{ lid, inner, outer, width }], brows: [{ top, bottom }] } (right eye/brow of the person first)
export async function wykryj(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw fail('Nie udało się otworzyć tego pliku. Wybierz zdjęcie w formacie JPG lub PNG.'); }
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const photo = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  photo.getContext('2d').drawImage(bmp, 0, 0, photo.width, photo.height);
  bmp.close();
  let lm;
  try { lm = await landmarker(); } catch { throw fail('Nie udało się wczytać przymierzalni. Sprawdź internet i spróbuj ponownie. Kreator działa dalej bez niej.'); }
  const faces = lm.detect(photo).faceLandmarks;
  if (!faces.length) throw fail('Nie widzimy twarzy na tym zdjęciu. Zrób selfie z bliska (twarz na większość kadru), na wprost, w dobrym świetle i bez okularów.');
  if (faces.length > 1) throw fail('Na zdjęciu jest więcej niż jedna osoba. Wybierz zdjęcie, na którym jesteś tylko Ty.');
  const P = i => [faces[0][i].x * photo.width, faces[0][i].y * photo.height], pts = ids => ids.map(P);
  const eye = ids => { const lid = pts(ids), inner = lid[0], outer = lid.at(-1); return { lid, inner, outer, width: Math.hypot(outer[0] - inner[0], outer[1] - inner[1]) }; };
  const eyes = [eye(LM.lidR), eye(LM.lidL)];
  if (Math.min(eyes[0].width, eyes[1].width) < MIN_EYE_PX) throw fail('Twarz jest na zdjęciu za mała. Zrób zdjęcie z bliska, tak żeby twarz wypełniała większość kadru.');
  const brows = [{ top: pts(LM.browTopR), bottom: pts(LM.browBotR) }, { top: pts(LM.browTopL), bottom: pts(LM.browBotL) }];
  // crop to eyes and brows with a margin, so a small phone screen still shows the detail
  const all = [...eyes.flatMap(e => e.lid), ...brows.flatMap(b => b.top)], xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  return { photo, eyes, brows, crop: kadr(photo, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 0.25, 0.9) };
}

// Box (x0, y0)-(x1, y1) grown by mx, my of its own size, clamped to the photo.
export function kadr(photo, x0, y0, x1, y1, mx, my) {
  const dx = (x1 - x0) * mx, dy = (y1 - y0) * my, x = Math.max(0, x0 - dx), y = Math.max(0, y0 - dy);
  return { x, y, w: Math.min(photo.width, x1 + dx) - x, h: Math.min(photo.height, y1 + dy) - y };
}

// The try-on block, one pattern for all creators. Before a photo: one compact row (two buttons + privacy line).
// After: sticky preview (tap = full screen), a before/after wipe slider, page extras, the honesty note.
// `mount` must be a display:contents child of the main column, so the preview can stick while the creator scrolls.
// wczytaj(file) -> { photo: canvas, crop: {x, y, w, h}, ... } (throw blad() for a message); draw(ctx, data) paints the
// "after" in photo pixels; label() describes it for screen readers; extra: HTML under the slider.
// demo: optional async () => data for a stock photo shown until the client picks her own; demoTekst: the caption under it.
// Returns redraw() for choice changes and pad() for pages that hide the block.
const BTN = 'min-height: 44px; padding: 0 14px; border-radius: 12px; font: inherit; font-size: 14px; cursor: pointer; background: #FFFFFF;';
export function przymierzalnia(mount, { co, draw, label, wczytaj = wykryj, ladowanie = 'Rozpoznajemy twarz… Za pierwszym razem pobieramy kilka MB.', extra = '', demo = null,
  demoTekst = 'Przykładowe oko ze zdjęcia stockowego. Podgląd orientacyjny, nie zmienia ceny. Zrób selfie, żeby zobaczyć efekt na sobie.' }) {
  const slider = `<label style="display: flex; align-items: center; gap: 10px; font-size: 13px">Przed<input type="range" data-pp min="0" max="100" value="100" aria-label="Przed i po: przesuń w lewo, żeby zobaczyć zdjęcie bez zmian" style="flex: 1; min-height: 44px; accent-color: #9E1F50">Po</label>`;
  mount.innerHTML = `<div role="group" aria-label="Przymierz na swoim zdjęciu" style="margin-top: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px">
      <button type="button" data-wej="selfie" style="${BTN} border: 1px solid #9E1F50; color: #9E1F50; font-weight: 700">Zrób selfie</button>
      <button type="button" data-wej="galeria" style="${BTN} border: 1px solid #E4D9DE; color: #1E1A1D; font-weight: 500">Wybierz z galerii</button>
      <span style="color: #625860; font-size: 12px; line-height: 1.4">Przymierz na swoim zdjęciu. Zdjęcie nie opuszcza telefonu.</span>
      <input type="file" accept="image/*" capture="user" data-plik="selfie" hidden><input type="file" accept="image/*" data-plik="galeria" hidden>
    </div>
    <p role="status" data-msg style="margin: 8px 0 0; font-size: 13px; line-height: 1.45" hidden></p>
    <button type="button" data-zoom aria-label="Powiększ podgląd" style="display: none; position: sticky; top: 0; z-index: 4; margin-top: 10px; padding: 0; border: 0; border-radius: 14px; background: #FAF6F8; cursor: zoom-in; overflow: hidden">
      <canvas role="img" style="display: block; width: 100%; height: auto; max-height: 38vh; object-fit: contain"></canvas>
      <span aria-hidden="true" style="position: absolute; right: 8px; bottom: 8px; padding: 4px 8px; border-radius: 8px; background: rgba(30,26,29,.7); color: #FFFFFF; font-size: 12px">Powiększ</span>
    </button>
    <div data-po style="display: none; flex-direction: column; gap: 8px; padding-top: 4px; color: #625860">
      ${slider}${extra}
      <span data-demo hidden style="font-size: 12px; line-height: 1.45"></span>
      <span data-pelny style="font-size: 12px; line-height: 1.45">Podgląd orientacyjny, nie zmienia ceny. Efekt zależy od Twoich ${co} i oceni go stylistka. Rozpoznawanie działa w przeglądarce: nic nie wysyłamy ani nie zapisujemy, a po zamknięciu strony zdjęcie znika.</span>
      <button type="button" data-usun style="${BTN} align-self: flex-start; border: 1px solid #E4D9DE; color: #625860">Usuń zdjęcie</button>
    </div>
    <dialog aria-label="Powiększony podgląd" style="width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 16px; border: 0; box-sizing: border-box; background: #1E1A1D; color: #FFFFFF">
      <div style="height: 100%; display: flex; flex-direction: column; gap: 10px">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px"><span style="font-size: 13px">Podgląd orientacyjny</span><button type="button" data-zamknij style="${BTN} border: 0; color: #1E1A1D; font-weight: 700">Zamknij</button></div>
        <div data-pan style="flex: 1 1 0; min-height: 0; overflow: auto; display: flex"><canvas role="img" style="flex: none; margin: auto"></canvas></div>
        ${slider}
      </div>
    </dialog>`;
  const $ = s => mount.querySelector(s), canvas = $('[data-zoom] canvas'), dialog = $('dialog'), big = $('dialog canvas'), msg = $('[data-msg]');
  $('[data-demo]').textContent = demoTekst;
  const ranges = mount.querySelectorAll('[data-pp]'); // before/after: the inline one and the one in full screen
  let data = null, token = 0, stock = null;
  const say = (t, err) => { msg.hidden = !t; msg.textContent = t || ''; msg.style.color = err ? '#A3262A' : '#625860'; };
  // step links (#krok-n) must not land under the sticky preview
  const pad = () => { document.documentElement.style.scrollPaddingTop = data ? $('[data-zoom]').getBoundingClientRect().height + 12 + 'px' : ''; };
  const show = on => { $('[data-zoom]').style.display = on ? 'block' : 'none'; $('[data-po]').style.display = on ? 'flex' : 'none'; pad(); };
  addEventListener('resize', pad);

  function redraw() {
    if (!data) return;
    const { crop } = data, ctx = canvas.getContext('2d'), split = canvas.width * ranges[0].value / 100;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(data.photo, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, split, canvas.height); ctx.clip(); // "after" left of the slider, untouched photo right of it
    ctx.setTransform(crop.k, 0, 0, crop.k, -crop.x * crop.k, -crop.y * crop.k);
    draw(ctx, data);
    ctx.restore();
    if (split > 0 && split < canvas.width) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(split - 1, 0, 2, canvas.height); }
    const text = (data === stock ? 'Podgląd na przykładowym zdjęciu: ' : 'Podgląd na Twoim zdjęciu: ') + label();
    canvas.setAttribute('aria-label', text); big.setAttribute('aria-label', text);
    if (dialog.open) { big.width = canvas.width; big.height = canvas.height; big.getContext('2d').drawImage(canvas, 0, 0); }
  }
  // full screen fills the height; on a phone a wide strip (eyes) may grow to 2.5 screen widths and pans sideways
  function fit() {
    const pan = $('[data-pan]'), { clientWidth: W, clientHeight: H } = pan;
    const k = Math.min(H / canvas.height, W / canvas.width * (W < 700 ? 2.5 : 1));
    big.style.width = canvas.width * k + 'px'; big.style.height = canvas.height * k + 'px';
    pan.scrollLeft = (pan.scrollWidth - W) / 2;
  }
  function use(d) {
    d.crop.k ??= Math.min(2, 1200 / d.crop.w);
    canvas.width = Math.round(d.crop.w * d.crop.k); canvas.height = Math.round(d.crop.h * d.crop.k);
    data = d; show(true); say('');
    $('[data-demo]').hidden = d !== stock; $('[data-pelny]').hidden = $('[data-usun]').hidden = d === stock;
    redraw();
  }
  // back to the stock photo when there is one, otherwise to the compact row only
  function reset() { token++; ranges.forEach(r => { r.value = 100; }); say(''); if (stock) return use(stock); data = null; show(false); canvas.width = canvas.height = 0; }
  demo?.().then(d => { stock = d; if (!data) use(d); }).catch(e => console.warn('Przykładowe zdjęcie niedostępne', e));

  mount.querySelectorAll('[data-wej]').forEach(b => b.addEventListener('click', () => $(`[data-plik="${b.dataset.wej}"]`).click()));
  mount.querySelectorAll('[data-plik]').forEach(input => input.addEventListener('change', async () => {
    const file = input.files[0]; input.value = ''; // same file can be picked again; the File object is not kept
    if (!file) return;
    reset(); const me = token;
    say(ladowanie);
    try {
      const d = await wczytaj(file);
      if (me !== token) return; // a newer photo was picked meanwhile
      use(d);
    } catch (e) {
      if (me !== token) return;
      say(e.pl ? e.message : 'Coś poszło nie tak z tym zdjęciem. Spróbuj innego. Kreator działa dalej bez przymierzalni.', true);
      if (!e.pl) console.warn(e);
    }
  }));
  $('[data-usun]').addEventListener('click', () => { reset(); $('[data-wej]').focus(); });
  ranges.forEach(r => r.addEventListener('input', () => { ranges.forEach(o => { o.value = r.value; }); redraw(); }));
  $('[data-zoom]').addEventListener('click', () => { dialog.showModal(); redraw(); fit(); });
  addEventListener('resize', () => dialog.open && fit());
  $('[data-zamknij]').addEventListener('click', () => dialog.close()); // Esc closes the dialog natively
  return { redraw, pad };
}

// Redraw whenever Kreator.ui re-renders (it replaces #kreator's content on every choice).
export const naZmiane = fn => new MutationObserver(() => fn()).observe(document.getElementById('kreator'), { childList: true });

// Point on a polyline at t in [0, 1] (by length) and the unit tangent there.
export function wzdluz(line, t) {
  const seg = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1])), total = seg.reduce((a, b) => a + b, 0);
  let d = t * total, i = 0;
  while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
  const a = line[i], b = line[i + 1], f = seg[i] ? d / seg[i] : 0;
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], u: [(b[0] - a[0]) / (seg[i] || 1), (b[1] - a[1]) / (seg[i] || 1)] };
}
console.assert((({ p, u }) => p[0] === 12.5 && p[1] === 10 && u[0] === 1)(wzdluz([[0, 0], [0, 10], [20, 10]], 0.75)), 'twarz.js wzdluz');
