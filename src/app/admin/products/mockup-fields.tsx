"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

export function MockupFields({ imageUrl }: { imageUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(imageUrl ?? null);
  const [remove, setRemove] = useState(false);
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

  return <div className="mockup-fields">
    <label>Product photo (optional)<input ref={fileInput} name="mockup_image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} /></label>
    <p className="form-help">PNG, JPG, or WebP up to 5 MB. The photo becomes the product card and front design preview. Customers can place artwork freely on it.</p>
    {imageUrl && <label className="checkbox-label"><input name="remove_mockup" type="checkbox" checked={remove} onChange={(event) => { setRemove(event.target.checked); setPreview(event.target.checked ? null : imageUrl); if (event.target.checked && fileInput.current) fileInput.current.value = ""; }} /> Remove current photo and use the standard studio photo</label>}
    {preview && <div className="mockup-stage"><span className="mockup-photo" role="img" aria-label="Product photo preview" style={{ backgroundImage: `url("${preview}")` }} /></div>}
  </div>;
}
