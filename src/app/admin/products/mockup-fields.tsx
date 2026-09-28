"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";
import { DEFAULT_PRINT_AREA } from "@/lib/product-mockup";
import type { PrintArea } from "@/lib/product-mockup";

export function MockupFields({ imageUrl, initialArea }: { imageUrl?: string | null; initialArea?: PrintArea | null }) {
  const [area, setArea] = useState(initialArea ?? DEFAULT_PRINT_AREA);
  const [preview, setPreview] = useState<string | null>(imageUrl ?? null);
  const [remove, setRemove] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemove(false);
    }
  }

  function point(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000))),
      y: Math.round(Math.max(0, Math.min(420, (event.clientY - rect.top) / rect.height * 420))),
    };
  }

  function startDraw(event: PointerEvent<HTMLButtonElement>) {
    dragStart.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function draw(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStart.current) return;
    const end = point(event);
    const start = dragStart.current;
    setArea({ left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y) });
  }

  return <div className="mockup-fields">
    <label>Product photo (optional)<input ref={fileInput} name="mockup_image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} /></label>
    <p className="form-help">PNG, JPG, or WebP up to 5 MB. The photo becomes the product card and the front design preview. Its original color stays as photographed.</p>
    {imageUrl && <label className="checkbox-label"><input name="remove_mockup" type="checkbox" checked={remove} onChange={(event) => { setRemove(event.target.checked); setPreview(event.target.checked ? null : imageUrl); if (event.target.checked && fileInput.current) fileInput.current.value = ""; }} /> Remove current photo and use the standard studio photo</label>}
    <strong>Print area</strong>
    <p className="form-help">Drag a rectangle over the part customers can decorate, or edit its edges below. For a shirt like this, place it on the chest or pocket.</p>
    <button type="button" className="mockup-stage" aria-label="Drag to set print area" onPointerDown={startDraw} onPointerMove={draw} onPointerUp={() => { dragStart.current = null; }} onPointerCancel={() => { dragStart.current = null; }}>
      {preview ? <span className="mockup-photo" role="img" aria-label="Product photo preview" style={{ backgroundImage: `url("${preview}")` }} /> : <span className="mockup-placeholder">Upload a product photo to preview its print area</span>}
      <span className="mockup-area" style={{ left: `${area.left / 10}%`, top: `${area.top / 4.2}%`, width: `${(area.right - area.left) / 10}%`, height: `${(area.bottom - area.top) / 4.2}%` }} />
    </button>
    <div className="form-row four">
      {(["left", "top", "right", "bottom"] as const).map((side) => <label key={side}>{side[0].toUpperCase() + side.slice(1)}<input name={`print_${side}`} type="number" min="0" max={side === "left" || side === "right" ? "1000" : "420"} value={area[side]} onChange={(event) => setArea((current) => ({ ...current, [side]: Number(event.target.value) }))} required /></label>)}
    </div>
  </div>;
}
