import type { PointerEvent } from "react";
import { HEIGHT, WIDTH, printArea } from "./model";
import type { Layer, Product, ShirtSide, TextLayer } from "./model";

function drawPen(ctx: CanvasRenderingContext2D, productColor: string, transparent = false) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (!transparent) { ctx.fillStyle = "#e5e5e5"; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
  ctx.save();
  ctx.shadowColor = "rgba(35,35,35,.25)";
  ctx.shadowBlur = 17;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = productColor;
  ctx.beginPath();
  ctx.roundRect(155, 165, 710, 62, 12);
  ctx.fill();
  ctx.restore();
  const shine = ctx.createLinearGradient(0, 165, 0, 227);
  shine.addColorStop(0, "rgba(255,255,255,.35)");
  shine.addColorStop(.4, "rgba(255,255,255,.04)");
  shine.addColorStop(1, "rgba(0,0,0,.17)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.roundRect(155, 165, 710, 62, 12);
  ctx.fill();
  ctx.fillStyle = "#aeb1b1";
  ctx.beginPath();
  ctx.moveTo(155, 168); ctx.lineTo(75, 188); ctx.lineTo(75, 204); ctx.lineTo(155, 224); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#575d5d";
  ctx.beginPath();
  ctx.roundRect(61, 192, 31, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#d2d4d3";
  ctx.beginPath();
  ctx.roundRect(865, 165, 45, 62, 8);
  ctx.fill();
  ctx.fillStyle = productColor;
  ctx.beginPath();
  ctx.roundRect(910, 180, 36, 32, 5);
  ctx.fill();
}

// Each studio photo has a matching soft mask in /images/masks (built by
// scripts/build-product-masks.mjs) marking exactly the recolorable surface.
const productMasks = new WeakMap<HTMLImageElement, HTMLImageElement>();
const tintSources = new WeakMap<HTMLImageElement, { alpha: Uint8Array; reference: number }>();

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

export async function loadProductPhoto(src: string) {
  const [photo, mask] = await Promise.all([loadImage(src), loadImage(src.replace("/images/", "/images/masks/").replace(/.png$/, "-mask.png"))]);
  productMasks.set(photo, mask);
  return photo;
}

function placePhoto(ctx: CanvasRenderingContext2D, product: Product, image: HTMLImageElement) {
  if (product === "shirts") {
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalWidth * HEIGHT / WIDTH, 0, 0, WIDTH, HEIGHT);
  } else if (product === "pens") {
    ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  } else {
    const width = HEIGHT * image.naturalWidth / image.naturalHeight;
    ctx.drawImage(image, (WIDTH - width) / 2, 0, width, HEIGHT);
  }
}

const luminance = (r: number, g: number, b: number) => .2126 * r + .7152 * g + .0722 * b;

function drawPhotoProduct(ctx: CanvasRenderingContext2D, product: Product, color: string, photo: HTMLImageElement) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#e5e5e5";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  placePhoto(ctx, product, photo);
  const mask = productMasks.get(photo);
  if (!mask) return;
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const pixels = image.data;
  let source = tintSources.get(photo);
  if (!source) {
    const layer = document.createElement("canvas");
    layer.width = WIDTH;
    layer.height = HEIGHT;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return;
    layerCtx.fillStyle = "#000000";
    layerCtx.fillRect(0, 0, WIDTH, HEIGHT);
    placePhoto(layerCtx, product, mask);
    const maskPixels = layerCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
    const alpha = new Uint8Array(WIDTH * HEIGHT);
    const tones: number[] = [];
    for (let index = 0; index < alpha.length; index++) {
      alpha[index] = maskPixels[index * 4];
      if (alpha[index] > 250) tones.push(luminance(pixels[index * 4], pixels[index * 4 + 1], pixels[index * 4 + 2]));
    }
    // The typical lit tone of the blank product shows the chosen color as-is;
    // darker areas keep their shading and brighter ones keep their highlights.
    // Cotton is matte, so almost all of the shirt counts as "lit" tone.
    tones.sort((a, b) => a - b);
    source = { alpha, reference: Math.max(1, tones[Math.floor(tones.length * (product === "shirts" ? .92 : .7))] ?? 230) };
    tintSources.set(photo, source);
  }
  const { alpha, reference } = source;
  const tint = [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16));
  const gloss = product === "pens" || product === "lighters" ? .8 : product === "hats" ? .45 : .15;
  const headroom = Math.max(.01, 255 / reference - 1);
  for (let index = 0; index < alpha.length; index++) {
    const opacity = alpha[index] / 255;
    if (!opacity) continue;
    const offset = index * 4;
    const shade = luminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]) / reference;
    const highlight = shade > 1 ? Math.min(1, (shade - 1) / headroom) * gloss : 0;
    for (let channel = 0; channel < 3; channel++) {
      const base = tint[channel] * Math.min(shade, 1);
      const recolored = base + (255 - base) * highlight;
      pixels[offset + channel] = Math.round(pixels[offset + channel] * (1 - opacity) + recolored * opacity);
    }
  }
  ctx.putImageData(image, 0, 0);
}

function drawProduct(ctx: CanvasRenderingContext2D, product: Product, color: string, transparent = false, photo?: HTMLImageElement | null) {
  if (photo?.complete && photo.naturalWidth) return drawPhotoProduct(ctx, product, color, photo);
  if (product === "pens") return drawPen(ctx, color, transparent);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (!transparent) { ctx.fillStyle = "#f8f5ef"; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
  ctx.save();
  ctx.shadowColor = "rgba(46,42,35,.2)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = color;
  if (product === "shirts") {
    ctx.beginPath();
    ctx.moveTo(390, 48); ctx.lineTo(435, 71); ctx.quadraticCurveTo(500, 116, 565, 71);
    ctx.lineTo(610, 48); ctx.lineTo(693, 98); ctx.lineTo(766, 182);
    ctx.lineTo(678, 246); ctx.lineTo(627, 195); ctx.lineTo(627, 380);
    ctx.lineTo(373, 380); ctx.lineTo(373, 195); ctx.lineTo(322, 246);
    ctx.lineTo(234, 182); ctx.lineTo(307, 98); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(45,45,42,.23)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(435, 71); ctx.quadraticCurveTo(500, 137, 565, 71); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(374, 367); ctx.lineTo(626, 367); ctx.stroke();
  } else if (product === "hats") {
    ctx.beginPath();
    ctx.moveTo(265, 245); ctx.bezierCurveTo(268, 94, 370, 46, 500, 46);
    ctx.bezierCurveTo(630, 46, 732, 94, 735, 245);
    ctx.quadraticCurveTo(500, 315, 265, 245); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.beginPath(); ctx.ellipse(500, 288, 300, 65, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(500, 274, 305, 64, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(45,45,42,.24)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(500, 53); ctx.lineTo(500, 104); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.roundRect(405, 92, 190, 275, 18); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#b7b8b2";
    ctx.beginPath(); ctx.roundRect(418, 52, 164, 57, [8, 8, 3, 3]); ctx.fill();
    ctx.fillStyle = "#6c716d";
    ctx.fillRect(447, 55, 106, 10);
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(417, 126); ctx.lineTo(417, 338); ctx.stroke();
  }
}

function layerDimensions(ctx: CanvasRenderingContext2D, layer: Layer) {
  if (layer.kind === "image") return { width: 125 * layer.scale, height: (125 * layer.scale) / layer.aspect };
  ctx.font = `700 ${34 * layer.scale}px ${layer.font}`;
  return { width: Math.max(ctx.measureText(layer.text || " ").width, 20), height: 42 * layer.scale + Math.abs(layer.curve ?? 0) * .22 };
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  ctx.fillStyle = layer.color;
  ctx.strokeStyle = layer.outlineColor ?? "#000000";
  ctx.lineWidth = (layer.outlineWidth ?? 0) * layer.scale;
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${34 * layer.scale}px ${layer.font}`;
  const curve = layer.curve ?? 0;
  if (!curve) {
    if (ctx.lineWidth) ctx.strokeText(layer.text || " ", 0, 0);
    ctx.fillText(layer.text || " ", 0, 0);
    return;
  }
  const letters = [...(layer.text || " ")];
  const widths = letters.map((letter) => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0);
  let position = -total / 2;
  for (let index = 0; index < letters.length; index++) {
    const width = widths[index];
    const x = position + width / 2;
    const relative = x / Math.max(1, total / 2);
    const y = curve * (relative * relative - 1) * .22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(curve * relative * .44, Math.max(total / 2, 1)));
    if (ctx.lineWidth) ctx.strokeText(letters[index], 0, 0);
    ctx.fillText(letters[index], 0, 0);
    ctx.restore();
    position += width;
  }
}

export function render(
  ctx: CanvasRenderingContext2D,
  product: Product,
  side: ShirtSide,
  productColor: string,
  layers: Layer[],
  selectedId: string | null,
  images: Map<string, HTMLImageElement>,
  showGuides: boolean,
  transparent = false,
  photo?: HTMLImageElement | null,
) {
  const PRINT = printArea(product, side);
  drawProduct(ctx, product, productColor, transparent, photo);
  const artwork = document.createElement("canvas");
  artwork.width = WIDTH;
  artwork.height = HEIGHT;
  const artCtx = artwork.getContext("2d");
  if (!artCtx) return;
  artCtx.save();
  for (const layer of layers) {
    const { width, height } = layerDimensions(artCtx, layer);
    artCtx.save();
    artCtx.translate(layer.x, layer.y);
    artCtx.rotate((layer.rotation * Math.PI) / 180);
    if (layer.kind === "text") {
      drawTextLayer(artCtx, layer);
    } else {
      const image = images.get(layer.src);
      if (image?.complete && image.naturalWidth) artCtx.drawImage(image, -width / 2, -height / 2, width, height);
    }
    artCtx.restore();
  }
  artCtx.restore();
  const base = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const print = artCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
  const pixels = base.data;
  // Artwork can sit anywhere on the product; the photo's surface mask keeps it
  // off the backdrop, metal parts, skin and denim.
  const surface = photo ? tintSources.get(photo)?.alpha : undefined;
  const centerX = Math.round((PRINT.left + PRINT.right) / 2);
  const centerY = Math.round((PRINT.top + PRINT.bottom) / 2);
  const center = (centerY * WIDTH + centerX) * 4;
  const reference = Math.max(1, .2126 * pixels[center] + .7152 * pixels[center + 1] + .0722 * pixels[center + 2]);
  for (let i = 0; i < pixels.length; i += 4) {
    if (!print[i + 3]) continue;
    const coverage = surface ? surface[i / 4] / 255 : 1;
    if (!coverage) continue;
    const light = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
    const shading = Math.max(.84, Math.min(1.1, light / reference));
    const opacity = print[i + 3] / 255 * coverage * (product === "lighters" ? .99 : .96);
    for (let channel = 0; channel < 3; channel++) {
      pixels[i + channel] = Math.round(pixels[i + channel] * (1 - opacity) + Math.min(255, print[i + channel] * shading) * opacity);
    }
  }
  ctx.putImageData(base, 0, 0);
  if (showGuides && selectedId) {
    const layer = layers.find((item) => item.id === selectedId);
    if (layer) {
      const { width, height } = layerDimensions(ctx, layer);
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.strokeStyle = "#215a40";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-width / 2 - 5, -height / 2 - 4, width + 10, height + 8);
      ctx.restore();
    }
  }
}

export function hitLayer(ctx: CanvasRenderingContext2D, layers: Layer[], x: number, y: number) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const angle = (-layer.rotation * Math.PI) / 180;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    const { width, height } = layerDimensions(ctx, layer);
    if (Math.abs(localX) <= width / 2 + 12 && Math.abs(localY) <= height / 2 + 12) return layer;
  }
  return null;
}

export function canvasPoint(event: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
}
