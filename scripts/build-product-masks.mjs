// Builds the soft product masks used by the Design Lab color picker.
// Each mask is a white PNG the same size as its studio photo whose alpha is
// the recolorable product surface (transparent over backdrop / metal / skin /
// denim), so it works both on a canvas and as a CSS mask-image.
// Run with `node scripts/build-product-masks.mjs [debug-dir]` after replacing a photo.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "public/images/masks");
const debugDir = process.argv[2];

const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const luma = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;

async function load(file) {
  const { data, info } = await sharp(path.join(root, "public/images", file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// Least-squares quadratic (or planar) surface through backdrop samples, one per channel,
// so gradients and vignetting in the studio backdrop are modelled per pixel.
function backdropModel({ data, width, height }, rects, quadratic = true) {
  const n = quadratic ? 6 : 3;
  const terms = (x, y) => { const u = x / width, v = y / height; return [1, u, v, u * u, u * v, v * v].slice(0, n); };
  const fits = [0, 1, 2].map((channel) => {
    const ata = Array.from({ length: n }, () => new Float64Array(n));
    const atb = new Float64Array(n);
    for (const [x0, y0, x1, y1] of rects) {
      for (let y = Math.round(y0 * height); y < Math.round(y1 * height); y += 6) {
        for (let x = Math.round(x0 * width); x < Math.round(x1 * width); x += 6) {
          const t = terms(x, y);
          const value = data[(y * width + x) * 3 + channel];
          for (let i = 0; i < n; i++) { atb[i] += t[i] * value; for (let j = 0; j < n; j++) ata[i][j] += t[i] * t[j]; }
        }
      }
    }
    // Gaussian elimination on the normal equations.
    const m = ata.map((row, i) => [...row, atb[i]]);
    for (let c = 0; c < n; c++) {
      let pivot = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
      [m[c], m[pivot]] = [m[pivot], m[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = m[r][c] / m[c][c];
        for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
      }
    }
    return m.map((row, i) => row[n] / row[i]);
  });
  return (x, y) => { const t = terms(x, y); return fits.map((coef) => coef.reduce((sum, c, i) => sum + c * t[i], 0)); };
}

// Keeps the parts of `core` connected to the seeds, then fills enclosed
// holes (stitching, eyelets, creases) up to `maxHole` pixels.
function connectAndFill(core, width, height, seeds, maxHole = Infinity) {
  const count = width * height;
  const keep = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  for (const [x, y] of seeds) { const i = y * width + x; if (core[i] && !keep[i]) { keep[i] = 1; queue[tail++] = i; } }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (n >= 0 && n < count && core[n] && !keep[n]) { keep[n] = 1; queue[tail++] = n; }
    }
  }
  const seen = new Uint8Array(count);
  for (let start = 0; start < count; start++) {
    if (keep[start] || seen[start]) continue;
    head = 0; tail = 0; queue[tail++] = start; seen[start] = 1;
    let touchesEdge = false;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = (i / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) {
        if (n >= 0 && !keep[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; }
      }
    }
    if (!touchesEdge && tail <= maxHole) for (let k = 0; k < tail; k++) keep[queue[k]] = 1;
  }
  return keep;
}

function morph(mask, width, height, radius, grow) {
  let current = mask;
  for (let pass = 0; pass < radius; pass++) {
    const next = new Uint8Array(current.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let value = current[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const n = nx < 0 || ny < 0 || nx >= width || ny >= height ? 0 : current[ny * width + nx];
        value = grow ? value | n : value & n;
      }
      next[i] = value;
    }
    current = next;
  }
  return current;
}

// Solid interior, soft 1–2px rim driven by the per-pixel score so edge pixels
// that blend product and backdrop are only partly recolored.
function finalize(core, score, width, height, closeRadius = 2) {
  const closed = morph(morph(core, width, height, closeRadius, true), width, height, closeRadius, false);
  const solid = morph(closed, width, height, 1, false);
  const rim = morph(closed, width, height, 1, true);
  const alpha = new Uint8Array(core.length);
  for (let i = 0; i < alpha.length; i++) {
    if (solid[i]) alpha[i] = 255;
    else if (closed[i]) alpha[i] = Math.round(255 * Math.max(.5, score[i]));
    else if (rim[i]) alpha[i] = Math.round(255 * Math.min(.5, score[i]));
  }
  return alpha;
}

// Warm fabric/plastic (red > blue) on a neutral grey backdrop. `minLift`
// rejects deep cast shadows, which pick up a warm bounce from the product.
function warmthMask(image, { bg, seeds, keep = () => 1, low = 3, high = 10, minLift = -255 }) {
  const { data, width, height } = image;
  const model = backdropModel(image, bg);
  const score = new Float32Array(width * height);
  const core = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, o = i * 3;
    const [br, bg, bb] = model(x, y);
    const lift = luma(data[o], data[o + 1], data[o + 2]) - luma(br, bg, bb);
    score[i] = smoothstep(low, high, (data[o] - data[o + 2]) - (br - bb)) * smoothstep(minLift - 12, minLift + 12, lift) * keep(x, y);
    core[i] = score[i] > .5 ? 1 : 0;
  }
  return finalize(connectAndFill(core, width, height, seeds), score, width, height);
}

// Horizontal glossy pen: every column runs from the bright upper edge down to
// the lower silhouette edge (dark contact rim or a jump back to the backdrop),
// so the dim underside is still counted as plastic.
function penMask(image) {
  const { data, width, height } = image;
  const model = backdropModel(image, [[0, 0, 1, .3], [0, .66, 1, 1]]);
  const L = (x, y) => { const o = (y * width + x) * 3; return luma(data[o], data[o + 1], data[o + 2]); };
  const bgL = (x, y) => luma(...model(x, y));
  const tipEnd = 139;
  const tops = new Float32Array(width).fill(NaN);
  const bottoms = new Float32Array(width).fill(NaN);
  for (let x = tipEnd; x < width; x++) {
    let top = -1;
    for (let y = Math.round(height * .3); y < Math.round(height * .55); y++) if (L(x, y) - bgL(x, y) > 20) { top = y; break; }
    if (top < 0) continue;
    let edge = -1;
    // Highlight bands inside the body are also sharp, so an edge only counts
    // once the pixels just below it look like backdrop or shadow.
    for (let y = top + 10; y < Math.min(height - 3, top + 150); y++) {
      if (Math.abs(L(x, y + 1) - L(x, y - 1)) > 8 && L(x, y + 3) < bgL(x, y + 3) + 6) { edge = y; break; }
    }
    if (edge < 0) continue;
    let bottom = edge, darkest = L(x, edge);
    for (let y = edge; y <= edge + 6; y++) if (L(x, y) < darkest) { darkest = L(x, y); bottom = y; }
    if (darkest > bgL(x, bottom) - 30) bottom = edge;
    if (bottom - top < 15) continue;
    tops[x] = top;
    bottoms[x] = bottom;
  }
  // A running median removes single-column misreads along the silhouette.
  const median = (values, x) => {
    const window = [];
    for (let k = Math.max(tipEnd, x - 4); k <= Math.min(width - 1, x + 4); k++) if (!Number.isNaN(values[k])) window.push(values[k]);
    window.sort((a, b) => a - b);
    return window.length ? window[window.length >> 1] : NaN;
  };
  const smoothTops = tops.map((_, x) => Number.isNaN(tops[x]) ? NaN : median(tops, x));
  const smoothBottoms = bottoms.map((_, x) => Number.isNaN(bottoms[x]) ? NaN : median(bottoms, x));
  // Both ends of the pen only taper, so the last few columns may never reach
  // outside the silhouette a little further in.
  const valid = [...smoothTops.keys()].filter((x) => !Number.isNaN(smoothTops[x]) && !Number.isNaN(smoothBottoms[x]));
  const [first, last] = [valid[0], valid[valid.length - 1]];
  for (const [end, inner] of [[first, first + 24], [last, last - 12]]) {
    for (let x = Math.min(end, inner); x <= Math.max(end, inner); x++) {
      if (Number.isNaN(smoothTops[x])) continue;
      smoothTops[x] = Math.max(smoothTops[x], smoothTops[inner]);
      smoothBottoms[x] = Math.min(smoothBottoms[x], smoothBottoms[inner]);
    }
  }
  const alpha = new Uint8Array(width * height);
  for (const x of valid) {
    const top = smoothTops[x], bottom = smoothBottoms[x];
    const edgeX = x === tipEnd ? .5 : 1;
    alpha[(top - 1) * width + x] = Math.round(255 * edgeX * smoothstep(4, 30, L(x, top - 1) - bgL(x, top - 1)));
    for (let y = top; y < bottom; y++) alpha[y * width + x] = Math.round(255 * edgeX);
    alpha[bottom * width + x] = Math.round(128 * edgeX);
  }
  return alpha;
}

// White cotton on a grey backdrop. The backdrop is flood-filled in from the
// image border through pixels that are neutral and almost perfectly smooth
// (studio paper changes by <2 levels per pixel; knitted cotton does not), so
// the fill stops at the shirt even where shaded folds match the backdrop grey.
// Whatever it cannot reach (and is not skin or denim) is shirt. A wall traced
// just inside the shadowed silhouette is a backstop against leaks.
function shirtMask(image, seeds, wallPoints, hemY) {
  const { data, width, height } = image;
  const count = width * height;
  const model = backdropModel(image, [[0, 0, .25, 1], [.75, 0, 1, 1]]);
  const score = new Float32Array(count);
  const backdropLike = new Uint8Array(count);
  const lum = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 3, x = i % width, y = (i / width) | 0;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const lift = luma(r, g, b) - luma(...model(x, y));
    const cloth = (1 - smoothstep(12, 24, r - b)) * (1 - smoothstep(8, 16, b - r));
    score[i] = smoothstep(3, 10, Math.abs(lift)) * cloth;
    lum[i] = luma(r, g, b);
    backdropLike[i] = Math.abs(lift) < 30 && Math.max(r, g, b) - Math.min(r, g, b) < 12 ? 1 : 0;
  }
  const wall = new Uint8Array(count);
  for (let k = 1; k < wallPoints.length; k++) {
    const [x0, y0] = wallPoints[k - 1], [x1, y1] = wallPoints[k];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let t = 0; t <= steps; t++) {
      const x = Math.round(x0 + (x1 - x0) * t / steps), y = Math.round(y0 + (y1 - y0) * t / steps);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) wall[(y + dy) * width + x + dx] = 1;
    }
  }
  const backdrop = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  const visit = (i, from) => {
    if (backdrop[i] || !backdropLike[i] || wall[i] || (from >= 0 && Math.abs(lum[i] - lum[from]) >= 2)) return;
    backdrop[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < width; x++) { visit(x, -1); visit((height - 1) * width + x, -1); }
  for (let y = 0; y < height; y++) { visit(y * width, -1); visit(y * width + width - 1, -1); }
  // The gaps between arms and torso are enclosed by skin, so they get their
  // own seeds: backdrop-toned pixels in a patch with no texture at all.
  const smooth = (i) => i % width > 0 && Math.abs(lum[i] - lum[i - 1]) < 2 && i >= width && Math.abs(lum[i] - lum[i - width]) < 2;
  for (let y = 5; y < height - 5; y += 3) {
    for (let x = 5; x < width - 5; x += 3) {
      const center = y * width + x;
      if (!backdropLike[center] || Math.abs(score[center]) > .2) continue;
      let flat = true;
      for (let dy = -4; dy <= 4 && flat; dy++) for (let dx = -4; dx <= 4 && flat; dx++) flat = smooth(center + dy * width + dx);
      if (flat) visit(center, -1);
    }
  }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    if (x > 0) visit(i - 1, i);
    if (x < width - 1) visit(i + 1, i);
    if (i >= width) visit(i - width, i);
    if (i < count - width) visit(i + width, i);
  }
  const core = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 3, r = data[o], b = data[o + 2];
    // Folds beside the arms pick up a warm bounce, so only clearly skin-toned
    // pixels are rejected; the opening below strips the thin skin/backdrop
    // blend along the arm outlines.
    core[i] = !backdrop[i] && r - b < 32 && b - r < 12 && i < hemY * width ? 1 : 0;
    if (core[i]) score[i] = Math.max(score[i], .5);
  }
  const opened = morph(morph(core, width, height, 2, false), width, height, 2, true);
  for (let i = 0; i < count; i++) opened[i] &= core[i];
  return finalize(connectAndFill(opened, width, height, seeds, 6000), score, width, height, 2);
}

const jobs = [
  ["studio-pen-photo.png", (image) => penMask(image)],
  ["studio-hat-photo.png", (image) => warmthMask(image, { bg: [[0, 0, .15, .6], [.85, 0, 1, .6], [0, 0, 1, .015]], seeds: [[768, 400], [768, 700]], minLift: -50 })],
  ["studio-lighter-photo.png", (image) => warmthMask(image, {
    bg: [[0, 0, .3, .9], [.7, 0, 1, .9]],
    seeds: [[768, 600]],
    // The metal hood and black fork sit above the body's straight top edge,
    // which is a few pixels higher beside the fork than under the hood.
    keep: (x, y) => x < 795 ? smoothstep(197.5, 200.5, y) : smoothstep(194.5, 196.5, y),
  })],
  // Walls run about 12px inside the traced right-hand silhouette (shoulder,
  // sleeve, sleeve hem, torso side, bottom hem); the last number is the row
  // below which only denim and hands remain.
  ["studio-shirt-model.png", (image) => shirtMask(image, [[768, 400], [768, 700], [470, 300], [1060, 300]],
    [[845, 35], [1020, 122], [1060, 205], [1085, 285], [1104, 340], [1110, 350], [985, 380], [948, 400], [946, 500], [955, 600], [966, 700], [976, 800], [980, 835], [900, 835]], 856)],
  ["studio-shirt-back.png", (image) => shirtMask(image, [[768, 400], [768, 700], [470, 300], [1060, 300]],
    [[845, 38], [1020, 128], [1062, 205], [1086, 275], [1104, 330], [1110, 342], [985, 366], [952, 400], [953, 500], [958, 600], [966, 700], [973, 800], [976, 820], [900, 820]], 849)],
];

mkdirSync(outputDir, { recursive: true });
if (debugDir) mkdirSync(debugDir, { recursive: true });
for (const [file, build] of jobs) {
  const image = await load(file);
  const alpha = build(image);
  const name = file.replace(/\.png$/, "-mask.png");
  const whiteWithAlpha = Buffer.alloc(alpha.length * 2, 255);
  for (let i = 0; i < alpha.length; i++) whiteWithAlpha[i * 2 + 1] = alpha[i];
  await sharp(whiteWithAlpha, { raw: { width: image.width, height: image.height, channels: 2 } }).png({ compressionLevel: 9 }).toFile(path.join(outputDir, name));
  if (debugDir) {
    const preview = Buffer.from(image.data);
    for (let i = 0; i < alpha.length; i++) {
      const a = alpha[i] / 255, o = i * 3;
      preview[o] = Math.round(preview[o] * (1 - a) + 230 * a * preview[o] / 255);
      preview[o + 1] = Math.round(preview[o + 1] * (1 - a) + 20 * a * preview[o + 1] / 255);
      preview[o + 2] = Math.round(preview[o + 2] * (1 - a) + 40 * a * preview[o + 2] / 255);
    }
    await sharp(preview, { raw: { width: image.width, height: image.height, channels: 3 } }).png().toFile(path.join(debugDir, name));
  }
  console.log(`wrote public/images/masks/${name}`);
}
