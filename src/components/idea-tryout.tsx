"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";

type Product = "shirts" | "hats" | "pens" | "lighters";

// Print spots are percentages of each studio photo; sizes use the stage's
// container width (cqw) so the print scales with the preview.
const products: Record<Product, { label: string; photo: string; mask: string; aspect: string; x: number; y: number; size: number; fit: number; rotate?: number; backdrop: string; studio: string }> = {
  shirts: { label: "T-shirt", photo: "/images/studio-shirt-model.png", mask: "/images/masks/studio-shirt-model-mask.png", aspect: "1536 / 1024", x: 50, y: 37, size: 5.2, fit: 10, backdrop: "#bebebf", studio: "/design/shirts" },
  hats: { label: "Hat", photo: "/images/studio-hat-photo.png", mask: "/images/masks/studio-hat-photo-mask.png", aspect: "1536 / 1024", x: 50, y: 35, size: 4.4, fit: 9, backdrop: "#c4c4c5", studio: "/design/hats" },
  pens: { label: "Pen", photo: "/images/studio-pen-photo.png", mask: "/images/masks/studio-pen-photo-mask.png", aspect: "1935 / 812", x: 51, y: 46.5, size: 3, fit: 20, backdrop: "linear-gradient(#afaaa6, #b6b1af)", studio: "/design/pens" },
  lighters: { label: "Lighter 18+", photo: "/images/studio-lighter-photo.png", mask: "/images/masks/studio-lighter-photo-mask.png", aspect: "1536 / 1024", x: 49.6, y: 58, size: 3.4, fit: 12, rotate: -90, backdrop: "#bbbcbf", studio: "/design/lighters" },
};
const order: Product[] = ["shirts", "hats", "pens", "lighters"];
const colors = [
  { name: "White", value: "#f4f1e9" }, { name: "Royal blue", value: "#3869ad" }, { name: "Red", value: "#c9393b" },
  { name: "Forest", value: "#244c3d" }, { name: "Yellow", value: "#e9c84b" }, { name: "Pink", value: "#d985a6" }, { name: "Black", value: "#292b29" },
];
const ideas = ["PRISHTINA", "Team 10", "Est. 2026", "Arta ✳", "Good vibes"];

function isDark(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return .2126 * r + .7152 * g + .0722 * b < 140;
}

export default function IdeaTryout() {
  const [product, setProduct] = useState<Product>("shirts");
  const [color, setColor] = useState(colors[2].value);
  const [text, setText] = useState("PRISHTINA");
  const item = products[product];
  const shown = text.trim() || "Your idea";
  const darkProduct = isDark(color);
  const printStyle = {
    left: `${item.x}%`,
    top: `${item.y}%`,
    fontSize: `${item.size * Math.min(1, item.fit / Math.max(shown.length, 1))}cqw`,
    transform: `translate(-50%, -50%)${item.rotate ? ` rotate(${item.rotate}deg)` : ""}`,
  } satisfies CSSProperties;

  return (
    <div className="pc-tryout">
      <div className="pc-tryout-controls">
        <span className="pc-kicker">TRY IT RIGHT HERE</span>
        <h2>Type it. Tint it. <span>See it.</span></h2>
        <p>Write a name, a team, or a date and watch it land on a real product photo. No account needed.</p>

        <div className="pc-tryout-field" role="radiogroup" aria-label="Product">
          <span className="pc-tryout-label">1 · Product</span>
          <div className="pc-tryout-products">
            {order.map((key) => <button type="button" role="radio" aria-checked={product === key} key={key} onClick={() => setProduct(key)}>{products[key].label}</button>)}
          </div>
        </div>

        <label className="pc-tryout-field">
          <span className="pc-tryout-label">2 · Your text</span>
          <input value={text} maxLength={22} onChange={(event) => setText(event.target.value)} placeholder="Your idea" />
        </label>
        <div className="pc-tryout-ideas" aria-label="Text ideas">
          {ideas.map((idea) => <button type="button" key={idea} onClick={() => setText(idea)} aria-pressed={text === idea}>{idea}</button>)}
        </div>

        <div className="pc-tryout-field" role="radiogroup" aria-label="Product color">
          <span className="pc-tryout-label">3 · Color <b>{colors.find((entry) => entry.value === color)?.name}</b></span>
          <div className="pc-tryout-colors">
            {colors.map((entry) => <button type="button" role="radio" aria-checked={color === entry.value} aria-label={entry.name} title={entry.name} key={entry.value} style={{ backgroundColor: entry.value }} onClick={() => setColor(entry.value)} />)}
          </div>
        </div>

        <Link href={item.studio} className="pc-button pc-button-orange">Finish it in the {item.label.replace(" 18+", "").toLowerCase()} studio <span aria-hidden="true">↗</span></Link>
      </div>

      <div className="pc-tryout-frame" style={{ background: item.backdrop }}>
        <div className="pc-tryout-stage" style={{ aspectRatio: item.aspect }}>
          <Image src={item.photo} alt={`${item.label} preview with your text`} fill sizes="(max-width: 900px) 100vw, 60vw" />
          <div className="pc-tryout-tint" style={{ backgroundColor: color, maskImage: `url(${item.mask})`, WebkitMaskImage: `url(${item.mask})` }} />
          {/* The same mask keeps the print on the product surface only. */}
          <div className="pc-tryout-print" style={{ maskImage: `url(${item.mask})`, WebkitMaskImage: `url(${item.mask})` }} aria-hidden="true">
            <span className={darkProduct ? "is-light-ink" : "is-dark-ink"} style={printStyle}>{shown}</span>
          </div>
        </div>
        <span className="pc-tryout-badge">Live preview</span>
      </div>
    </div>
  );
}
