"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, PointerEvent } from "react";
import type { OrderOptions } from "@/lib/order-options";
import OrderCheckout from "./order-checkout";
import type { OrderDetails } from "./order-checkout";
import { removePlainBackground } from "@/lib/remove-plain-background";
import { DEFAULT_PRINT_AREA } from "@/lib/product-mockup";
import type { PrintArea } from "@/lib/product-mockup";
import { HEIGHT, WIDTH, artIcons, initialLayers, photoSources, printArea, products, shirtSides } from "./model";
import type { DragState, DraftSnapshot, Layer, Personalization, Product, ShirtSide, ShirtTool, TextLayer, ViewDrag } from "./model";
import { canvasPoint, hitLayer, loadImage, loadProductPhoto, render } from "./canvas";

const legacyProductIds: Record<Product, string> = { pens: "product-pen", shirts: "product-tshirt", hats: "product-hat", lighters: "product-lighter" };

export default function ProductDesigner({ product, catalogProductId, catalogName, catalogAgeRestricted, catalogImageUrl, catalogPrintArea, catalogProducts, orderOptions, minimumQuantity, customer }: { product: Product; catalogProductId: string; catalogName: string; catalogAgeRestricted: boolean; catalogImageUrl: string | null; catalogPrintArea: PrintArea | null; catalogProducts: { id: string; name: string; slug: string; design_template: Product; age_restricted: boolean }[]; orderOptions: OrderOptions | null; minimumQuantity: number; customer: { name: string; email: string } | null }) {
  const config = products[product];
  const customPhoto = Boolean(catalogImageUrl);
  const customArea = customPhoto ? (catalogPrintArea ?? DEFAULT_PRINT_AREA) : null;
  const canRequest = product !== "lighters" && !catalogAgeRestricted;
  const canOrder = canRequest && Boolean(orderOptions?.variants.length);
  const [shirtSide, setShirtSide] = useState<ShirtSide>("front");
  const [shirtTool, setShirtTool] = useState<ShirtTool>(customPhoto ? "text" : "product");
  const [artColor, setArtColor] = useState("#0000ee");
  const [rosterName, setRosterName] = useState("");
  const [rosterNumber, setRosterNumber] = useState("");
  const [rosterSize, setRosterSize] = useState("M");
  const [personalizations, setPersonalizations] = useState<Personalization[]>([]);
  const [colorVariants, setColorVariants] = useState<string[]>([]);
  const PRINT = customArea ?? printArea(product, shirtSide);
  const productColors = config.colors;
  const STORAGE_KEY = `perty-${catalogProductId}-design-v1`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shirtUploadRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const photoRef = useRef<HTMLImageElement | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const viewDragRef = useRef<ViewDrag | null>(null);
  const pastRef = useRef<DraftSnapshot[]>([]);
  const futureRef = useRef<DraftSnapshot[]>([]);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const [viewMode, setViewMode] = useState<"edit" | "inspect">("edit");
  const [yaw, setYaw] = useState(-22);
  const [pitch, setPitch] = useState(13);
  const [zoom, setZoom] = useState(1);
  const [productColor, setProductColor] = useState(config.colors[0].value);
  const [layers, setLayers] = useState<Layer[]>(() => product === "shirts" ? [] : initialLayers.map((layer) => ({ ...layer, font: "PertySharpSans", color: "#000000", x: (PRINT.left + PRINT.right) / 2, y: (PRINT.top + PRINT.bottom) / 2, scale: product === "lighters" ? .52 : product === "hats" ? .75 : product === "pens" ? .65 : 1 })));
  const [selectedId, setSelectedId] = useState<string | null>(product === "shirts" ? null : "starter");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(`Move a design directly on the ${config.singular} with your finger or mouse.`);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const visibleLayers = useMemo(() => product === "shirts" ? layers.filter((layer) => (layer.side ?? "front") === shirtSide) : layers, [product, layers, shirtSide]);
  const selected = visibleLayers.find((layer) => layer.id === selectedId) ?? null;

  function currentSnapshot(): DraftSnapshot { return { layers, color: productColor, selectedId, side: shirtSide, personalizations, colorVariants }; }
  function rememberChange() {
    pastRef.current = [...pastRef.current.slice(-29), currentSnapshot()];
    futureRef.current = [];
    setHistoryState({ undo: pastRef.current.length, redo: 0 });
  }
  function restoreSnapshot(snapshot: DraftSnapshot) {
    setLayers(snapshot.layers);
    setProductColor(snapshot.color);
    setSelectedId(snapshot.selectedId);
    setShirtSide(snapshot.side);
    setPersonalizations(snapshot.personalizations);
    setColorVariants(snapshot.colorVariants);
    setHistoryState({ undo: pastRef.current.length, redo: futureRef.current.length });
  }
  function undo() {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(currentSnapshot());
    restoreSnapshot(previous);
  }
  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(currentSnapshot());
    restoreSnapshot(next);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY) ?? (catalogProductId === legacyProductIds[product] ? localStorage.getItem(`perty-${product}-design-v1`) : null);
        if (saved) {
          const draft = JSON.parse(saved) as { productColor?: string; pencilColor?: string; layers?: Layer[]; shirtSide?: ShirtSide; personalizations?: Personalization[]; colorVariants?: string[] };
          const savedColor = draft.productColor ?? draft.pencilColor;
          if (typeof savedColor === "string" && /^#[0-9a-fA-F]{6}$/.test(savedColor)) setProductColor(savedColor);
          if (product === "shirts" && !customPhoto && shirtSides.some((side) => side.id === draft.shirtSide)) setShirtSide(draft.shirtSide!);
          if (product === "shirts" && !customPhoto && Array.isArray(draft.personalizations)) setPersonalizations(draft.personalizations.filter((entry) => entry && typeof entry.name === "string" && typeof entry.number === "string" && typeof entry.size === "string").slice(0, 100));
          if (product !== "lighters" && Array.isArray(draft.colorVariants)) setColorVariants(draft.colorVariants.filter((color) => typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)).slice(0, 12));
          if (Array.isArray(draft.layers)) {
            const valid = draft.layers.filter((layer) => layer && typeof layer.id === "string" && Number.isFinite(layer.x) && Number.isFinite(layer.y) && (layer.kind === "text" || layer.kind === "image") && (!customPhoto || (layer.side ?? "front") === "front"));
            setLayers(valid);
            setSelectedId(valid[0]?.id ?? null);
          }
        }
      } catch { /* A damaged local draft starts fresh. */ }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [STORAGE_KEY, catalogProductId, product, customPhoto]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ productColor, layers, shirtSide, personalizations, colorVariants })); }
    catch { queueMicrotask(() => setMessage("This browser could not save the draft. Download a preview to keep a copy.")); }
  }, [loaded, productColor, layers, shirtSide, personalizations, colorVariants, STORAGE_KEY]);

  useEffect(() => {
    let active = true;
    (catalogImageUrl ? loadImage(catalogImageUrl) : loadProductPhoto(product === "shirts" && shirtSide === "back" ? "/images/studio-shirt-back.png" : photoSources[product]))
      .then((photo) => { if (active) { photoRef.current = photo; setPhotoReady(true); } })
      .catch(() => { if (active) { setPhotoReady(true); setMessage("The product photo could not load. A simple preview is shown instead."); } });
    return () => { active = false; };
  }, [product, shirtSide, catalogImageUrl]);

  useEffect(() => {
    let active = true;
    document.fonts.load("700 34px PertySharpSans").then(() => { if (active) setFontReady(true); }).catch(() => { /* Canvas falls back to a system font. */ });
    return () => { active = false; };
  }, [product]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    for (const layer of layers) {
      if (layer.kind !== "image" || imagesRef.current.has(layer.src)) continue;
      const image = new Image();
      image.onload = () => render(ctx, product, shirtSide, productColor, visibleLayers, viewMode === "edit" ? selectedId : null, imagesRef.current, viewMode === "edit", viewMode === "inspect", photoRef.current, customArea);
      image.src = layer.src;
      imagesRef.current.set(layer.src, image);
    }
    render(ctx, product, shirtSide, productColor, visibleLayers, viewMode === "edit" ? selectedId : null, imagesRef.current, viewMode === "edit", viewMode === "inspect", photoRef.current, customArea);
  }, [layers, visibleLayers, productColor, selectedId, product, shirtSide, viewMode, photoReady, fontReady, customArea]);

  function updateSelected(patch: Partial<Layer>) {
    if (!selectedId) return;
    setLayers((current) => current.map((layer) => layer.id === selectedId ? { ...layer, ...patch } as Layer : layer));
    if (typeof (patch as Partial<TextLayer>).text === "string" && (selectedId === "roster-name" || selectedId === "roster-number")) {
      const value = (patch as Partial<TextLayer>).text!;
      setPersonalizations((current) => current.map((entry, index) => index === 0 ? { ...entry, [selectedId === "roster-name" ? "name" : "number"]: value } : entry));
    }
  }

  function addText() {
    if (layers.length >= 20) { setMessage("Remove a design layer before adding another one."); return; }
    rememberChange();
    setViewMode("edit");
    const id = crypto.randomUUID();
    setLayers((current) => [...current, { id, kind: "text", text: "YOUR TEXT", color: "#000000", font: "PertySharpSans", x: (PRINT.left + PRINT.right) / 2, y: (PRINT.top + PRINT.bottom) / 2, scale: customArea ? Math.max(.4, Math.min(1, (PRINT.right - PRINT.left) / 210)) : product === "lighters" ? .52 : product === "hats" ? .75 : product === "pens" ? .65 : product === "shirts" && shirtSide !== "front" && shirtSide !== "back" ? .55 : 1, rotation: 0, side: product === "shirts" ? shirtSide : undefined }]);
    setSelectedId(id);
  }

  function switchShirtSide(side: ShirtSide) {
    if (side === shirtSide) return;
    photoRef.current = null;
    setPhotoReady(false);
    setSelectedId(null);
    setViewMode("edit");
    setShirtSide(side);
  }

  function addArt(icon: (typeof artIcons)[number]) {
    if (layers.length >= 20) { setMessage("Remove a design layer before adding another one."); return; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${artColor}" d="${icon.path}"/></svg>`;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, 512, 512);
      rememberChange();
      const id = crypto.randomUUID();
      setLayers((current) => [...current, { id, kind: "image", src: canvas.toDataURL("image/png"), aspect: 1, x: (PRINT.left + PRINT.right) / 2, y: (PRINT.top + PRINT.bottom) / 2, scale: customArea ? Math.max(.4, Math.min(1, (PRINT.right - PRINT.left) / 150)) : product === "pens" ? .26 : product === "lighters" ? .8 : product === "shirts" && shirtSide !== "front" && shirtSide !== "back" ? .55 : 1, rotation: 0, side: product === "shirts" ? shirtSide : undefined }]);
      setSelectedId(id);
      setViewMode("edit");
      setMessage(`${icon.name} added to the ${product === "shirts" ? shirtSides.find((item) => item.id === shirtSide)?.label.toLowerCase() : config.singular}.`);
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function addPersonalization() {
    const entry = { name: rosterName.trim(), number: rosterNumber.trim(), size: rosterSize };
    if (!entry.name && !entry.number) { setMessage("Enter a name or number first."); return; }
    if (personalizations.length >= 100) { setMessage("You can add up to 100 personalized shirts."); return; }
    if (!personalizations.length && layers.length > 18) { setMessage("Remove two design layers before adding names and numbers."); return; }
    rememberChange();
    if (!personalizations.length) {
      const labels: TextLayer[] = [
        { id: "roster-name", kind: "text", side: "back", text: entry.name.slice(0, 32) || "NAME", color: "#000000", font: "PertySharpSans", x: 500, y: 135, scale: .8, rotation: 0 },
        { id: "roster-number", kind: "text", side: "back", text: entry.number || "00", color: "#000000", font: "PertySharpSans", x: 500, y: 210, scale: 2, rotation: 0 },
      ];
      setLayers((current) => [...current, ...labels]);
      switchShirtSide("back");
      setSelectedId("roster-name");
    }
    setPersonalizations((current) => [...current, entry]);
    setRosterName("");
    setRosterNumber("");
    setMessage("Personalized shirt added. The back preview shows the first entry; the full list goes to the admin team.");
  }

  function removePersonalization(index: number) {
    rememberChange();
    const next = personalizations.filter((_, position) => position !== index);
    setPersonalizations(next);
    setLayers((current) => current.flatMap((layer) => {
      if (layer.id !== "roster-name" && layer.id !== "roster-number") return [layer];
      if (!next.length) return [];
      return [{ ...layer, text: layer.id === "roster-name" ? next[0].name.slice(0, 32) || "NAME" : next[0].number || "00" }];
    }));
    if (!next.length) setSelectedId(null);
  }

  function loadImageFile(file: File) {
    if (layers.length >= 20) { setMessage("Remove a design layer before adding another one."); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
      setMessage("Choose a PNG, JPG, or WebP image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new Image();
      image.onload = () => {
        let source = reader.result as string;
        let backgroundRemoved = false;
        const maxSide = 1200;
        const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
        const cleanCanvas = document.createElement("canvas");
        cleanCanvas.width = Math.max(1, Math.round(image.width * ratio));
        cleanCanvas.height = Math.max(1, Math.round(image.height * ratio));
        const cleanContext = cleanCanvas.getContext("2d", { willReadFrequently: true });
        if (cleanContext) {
          cleanContext.drawImage(image, 0, 0, cleanCanvas.width, cleanCanvas.height);
          const imageData = cleanContext.getImageData(0, 0, cleanCanvas.width, cleanCanvas.height);
          if (removePlainBackground(imageData.data, cleanCanvas.width, cleanCanvas.height)) {
            cleanContext.putImageData(imageData, 0, 0);
            const transparentPng = cleanCanvas.toDataURL("image/png");
            if (transparentPng.length <= 1_300_000) {
              source = transparentPng;
              backgroundRemoved = true;
            }
          }
        }
        rememberChange();
        setViewMode("edit");
        const id = crypto.randomUUID();
        setLayers((current) => [...current, { id, kind: "image", src: source, aspect: image.width / image.height, x: (PRINT.left + PRINT.right) / 2, y: (PRINT.top + PRINT.bottom) / 2, scale: customArea ? Math.max(.4, Math.min(1, (PRINT.right - PRINT.left) / 150)) : product === "pens" ? .3 : product === "lighters" ? .85 : product === "shirts" && shirtSide !== "front" && shirtSide !== "back" ? .55 : 1, rotation: 0, side: product === "shirts" ? shirtSide : undefined }]);
        setSelectedId(id);
        setMessage(`${backgroundRemoved ? "Plain background removed. " : "Image added. "}Drag it on the ${config.singular} to place it.`);
      };
      image.onerror = () => setMessage("That image could not be opened.");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) loadImageFile(file);
  }

  function onImageDrop(event: DragEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) loadImageFile(file);
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (viewMode === "inspect") {
      viewDragRef.current = { x: event.clientX, y: event.clientY, yaw, pitch };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.focus();
    const point = canvasPoint(event, canvas);
    const layer = hitLayer(ctx, visibleLayers, point.x, point.y);
    setSelectedId(layer?.id ?? null);
    if (!layer) return;
    rememberChange();
    dragRef.current = { id: layer.id, dx: point.x - layer.x, dy: point.y - layer.y };
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (viewMode === "inspect") {
      const drag = viewDragRef.current;
      if (!drag) return;
      setYaw(Math.max(-65, Math.min(65, drag.yaw + (event.clientX - drag.x) * .3)));
      setPitch(Math.max(-40, Math.min(40, drag.pitch - (event.clientY - drag.y) * .3)));
      return;
    }
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const point = canvasPoint(event, canvas);
    setLayers((current) => current.map((layer) => layer.id === drag.id ? {
      ...layer,
      x: Math.max(customArea?.left ?? 0, Math.min(customArea?.right ?? WIDTH, point.x - drag.dx)),
      y: Math.max(customArea?.top ?? 0, Math.min(customArea?.bottom ?? HEIGHT, point.y - drag.dy)),
    } : layer));
  }

  function onPointerUp() { dragRef.current = null; viewDragRef.current = null; }

  function onCanvasKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    if (viewMode === "inspect") return;
    if (selectedId && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); deleteSelected(); return; }
    if (!selectedId || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    rememberChange();
    const step = event.shiftKey ? 10 : 2;
    setLayers((current) => current.map((layer) => layer.id === selectedId ? {
      ...layer,
      x: Math.max(customArea?.left ?? 0, Math.min(customArea?.right ?? WIDTH, layer.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0))),
      y: Math.max(customArea?.top ?? 0, Math.min(customArea?.bottom ?? HEIGHT, layer.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0))),
    } : layer));
  }

  function downloadPreview() {
    const preview = createPreview();
    if (!preview) { setMessage("The product photo is still loading. Please try again in a moment."); return; }
    const link = document.createElement("a");
    link.download = `perty-${product}${product === "shirts" ? `-${shirtSide}` : ""}-preview.png`;
    link.href = preview;
    link.click();
    setMessage("Preview downloaded. This is a visual mockup, not a production print file.");
  }

  function onCanvasPaste(event: ClipboardEvent<HTMLCanvasElement>) {
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    loadImageFile(file);
  }

  async function sharePreview() {
    const preview = createPreview();
    if (!preview) return;
    const blob = await (await fetch(preview)).blob();
    const file = new File([blob], `perty-${product}${product === "shirts" ? `-${shirtSide}` : ""}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `My ${config.singular} design` }); }
      catch { /* Closing the share sheet leaves the design intact. */ }
      return;
    }
    downloadPreview();
  }

  function createPreview(): string | null {
    if (!photoReady) return null;
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = WIDTH;
    previewCanvas.height = HEIGHT;
    const previewContext = previewCanvas.getContext("2d");
    if (!previewContext) return null;
    render(previewContext, product, shirtSide, productColor, visibleLayers, null, imagesRef.current, false, false, photoRef.current, customArea);
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * 2;
    canvas.height = HEIGHT * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(previewCanvas, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }

  async function createRequestPreview(): Promise<{ png: string; height: number; side: ShirtSide | "overview" } | null> {
    if (product !== "shirts" || customPhoto) {
      const png = createPreview();
      return png ? { png, height: HEIGHT, side: "front" } : null;
    }
    const areas = shirtSides.filter((side) => layers.some((layer) => (layer.side ?? "front") === side.id));
    if (!areas.length) return null;
    const mockups = await Promise.all(areas.map((side) => loadProductPhoto(side.id === "back" ? "/images/studio-shirt-back.png" : photoSources.shirts)
      .catch(() => { throw new Error(`Could not load the ${side.label.toLowerCase()} shirt photo.`); })));
    if (areas.length === 1) {
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return null;
      render(context, product, areas[0].id, productColor, layers.filter((layer) => (layer.side ?? "front") === areas[0].id), null, imagesRef.current, false, false, mockups[0]);
      return { png: canvas.toDataURL("image/png"), height: HEIGHT, side: areas[0].id };
    }
    const rows = Math.ceil(areas.length / 2);
    const sheet = document.createElement("canvas");
    sheet.width = WIDTH;
    sheet.height = rows * 210;
    const context = sheet.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#f6f6f6";
    context.fillRect(0, 0, sheet.width, sheet.height);
    areas.forEach((side, index) => {
      const tile = document.createElement("canvas");
      tile.width = WIDTH;
      tile.height = HEIGHT;
      const tileContext = tile.getContext("2d");
      if (!tileContext) return;
      render(tileContext, product, side.id, productColor, layers.filter((layer) => (layer.side ?? "front") === side.id), null, imagesRef.current, false, false, mockups[index]);
      const x = (index % 2) * 500;
      const y = Math.floor(index / 2) * 210;
      context.drawImage(tile, x, y, 500, 210);
      context.fillStyle = "#ffffff";
      context.fillRect(x + 8, y + 8, 102, 24);
      context.fillStyle = "#242424";
      context.font = "700 12px PertySharpSans, Arial";
      context.fillText(side.label, x + 16, y + 25);
    });
    return { png: sheet.toDataURL("image/png"), height: sheet.height, side: "overview" };
  }

  async function submitDesign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submittedId || !canRequest) return;
    setSubmitError(null);
    if (!layers.length || layers.some((layer) => layer.kind === "text" && !layer.text.trim())) {
      setSubmitError("Add a design and make sure text layers are not empty before submitting.");
      return;
    }
    if (layers.some((layer) => layer.kind === "image" && !imagesRef.current.get(layer.src)?.naturalWidth)) {
      setSubmitError("Wait for your uploaded image to finish loading, then try again.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const preview = await createRequestPreview();
      if (!preview) throw new Error("The preview could not be created. Please try again.");
      const response = await fetch("/api/design-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          catalogProductId,
          customerName: String(form.get("customer_name") ?? "").trim(),
          customerEmail: String(form.get("customer_email") ?? "").trim(),
          customerPhone: String(form.get("customer_phone") ?? "").trim(),
          quantity: Number(form.get("quantity")),
          notes: String(form.get("notes") ?? "").trim(),
          productColor: productColor,
          layers,
          personalizations: product === "shirts" ? personalizations : undefined,
          previewSide: product === "shirts" ? preview.side : undefined,
          previewHeight: product === "shirts" ? preview.height : undefined,
          productColors: [...new Set([productColor, ...colorVariants])],
          previewPng: preview.png,
        }),
      });
      const result = await response.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!response.ok || !result?.id) throw new Error(result?.error ?? "Could not send your design. Please try again.");
      setSubmittedId(result.id);
      setMessage("Your design request was sent to the shop.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not send your design. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function placeOrder(details: OrderDetails) {
    if (submitting || placedId || !canOrder) return;
    setSubmitError(null);
    if (!layers.length || layers.some((layer) => layer.kind === "text" && !layer.text.trim())) { setSubmitError("Add a design and make sure text layers are not empty before ordering."); return; }
    if (layers.some((layer) => layer.kind === "image" && !imagesRef.current.get(layer.src)?.naturalWidth)) { setSubmitError("Wait for your uploaded image to finish loading, then try again."); return; }
    if (personalizations.length && personalizations.length !== details.quantity) { setSubmitError("Quantity must match the number of personalized shirts."); return; }
    setSubmitting(true);
    try {
      const preview = await createRequestPreview();
      if (!preview) throw new Error("The preview could not be created. Please try again.");
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...details, product, catalogProductId, productColor, layers,
        personalizations: product === "shirts" ? personalizations : undefined,
        previewSide: product === "shirts" ? preview.side : undefined,
        previewHeight: product === "shirts" ? preview.height : undefined,
        productColors: [...new Set([productColor, ...colorVariants])], previewPng: preview.png,
      }) });
      const result = await response.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!response.ok || !result?.id) throw new Error(result?.error ?? "Could not place your order. Please try again.");
      setPlacedId(result.id);
      setMessage("Your order was placed. The shop will contact you about payment and fulfillment.");
    } catch (error) { setSubmitError(error instanceof Error ? error.message : "Could not place your order. Please try again."); }
    finally { setSubmitting(false); }
  }

  function resetDesign() {
    rememberChange();
    setLayers([]);
    setPersonalizations([]);
    setColorVariants([]);
    setSelectedId(null);
    setProductColor(productColors[0].value);
    setMessage(`Blank ${config.singular} ready. Add text or upload an image to start.`);
  }

  function duplicateSelected() {
    if (!selected) return;
    if (layers.length >= 20) { setMessage("Remove a design layer before duplicating another one."); return; }
    rememberChange();
    const id = crypto.randomUUID();
    setLayers((current) => [...current, { ...selected, id, x: Math.min(WIDTH, selected.x + 18), y: Math.min(HEIGHT, selected.y + 18) }]);
    setSelectedId(id);
  }

  function deleteSelected() {
    if (!selected) return;
    rememberChange();
    setLayers((current) => current.filter((layer) => layer.id !== selected.id));
    setSelectedId(null);
    setMessage(`${selected.kind === "text" ? "Text" : "Image"} removed. Use Undo to bring it back.`);
    canvasRef.current?.focus();
  }

  function centerSelected() {
    if (!selected) return;
    rememberChange();
    updateSelected({ x: (PRINT.left + PRINT.right) / 2, y: (PRINT.top + PRINT.bottom) / 2 });
  }

  function moveSelected(direction: -1 | 1) {
    if (!selected) return;
    const index = layers.findIndex((layer) => layer.id === selected.id);
    const target = index + direction;
    if (target < 0 || target >= layers.length) return;
    rememberChange();
    setLayers((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <main className="studio-page is-lab">
      <div className="studio-shell">
        <div className="studio-top"><Link href="/#shop-categories" className="studio-back">← Back to products</Link><span className="studio-badge">{canOrder ? "Design Lab · Order online" : canRequest ? "Design Lab · Request a quote" : "Design Lab · 18+ preview only"}</span></div>
        <div className="studio-heading"><span className="store-kicker">{catalogName.toUpperCase()}</span><h1>Design {catalogName}.</h1><p>{customPhoto ? "Add text or artwork, then drag it into the marked print area on this product photo." : `Choose a color, add your text or artwork, then drag it anywhere on the ${config.singular}.`} Use your finger on a phone or tablet.</p><nav className="studio-product-nav" aria-label="Choose a product to design">{catalogProducts.map((item) => <Link key={item.id} href={`/design/${item.slug}`} aria-current={catalogProductId === item.id ? "page" : undefined}>{item.name}{item.age_restricted ? " 18+" : ""}</Link>)}</nav></div>
        <div className="studio-grid">
          <section className="studio-preview" aria-label={`${catalogName} design preview`}>
            <div className="studio-preview-header"><strong>Live preview</strong><span>{viewMode === "edit" ? customPhoto ? "Drag artwork inside the marked print area" : "Drag artwork anywhere on the product" : "Drag the product to inspect it from an angle"}</span></div>
            <div className="studio-view-toolbar">
              <div className="studio-view-tabs" role="group" aria-label="Preview mode"><button type="button" aria-pressed={viewMode === "edit"} onClick={() => setViewMode("edit")}>Edit design</button><button type="button" aria-pressed={viewMode === "inspect"} onClick={() => setViewMode("inspect")}>Angle view</button></div>
              <div className="studio-history"><button type="button" onClick={undo} disabled={!historyState.undo} aria-label="Undo">↶ Undo</button><button type="button" onClick={redo} disabled={!historyState.redo} aria-label="Redo">↷ Redo</button></div>
            </div>
            {product === "shirts" && !customPhoto && <div className="studio-side-switcher" role="group" aria-label="T-shirt print area">
              {shirtSides.map((side) => <button key={side.id} type="button" aria-pressed={shirtSide === side.id} onClick={() => switchShirtSide(side.id)}>{side.label}<small>{layers.filter((layer) => (layer.side ?? "front") === side.id).length} designs</small></button>)}
            </div>}
            {selected && <div className="studio-selection-bar"><span>Selected: <strong>{selected.kind === "text" ? selected.text || "Untitled text" : "Uploaded image"}</strong></span><button type="button" onClick={deleteSelected}>Delete selected {selected.kind === "text" ? "text" : "image"}</button></div>}
            <div className={`studio-view-stage ${viewMode === "inspect" ? "is-inspecting" : ""}`}>
              <div className="studio-view-object" style={{ transform: viewMode === "inspect" ? `rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${zoom})` : `scale(${zoom})` }}>
                <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label={`${config.name} preview. ${viewMode === "inspect" ? "Drag to rotate the angled view." : "Select and drag artwork. Use arrow keys to move it or Delete to remove it."}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onCanvasKeyDown} onPaste={onCanvasPaste} onDragOver={(event) => event.preventDefault()} onDrop={onImageDrop} />
              </div>
            </div>
            <div className="studio-view-controls"><label>Zoom <strong>{Math.round(zoom * 100)}%</strong><input type="range" min="0.7" max="1.7" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>{viewMode === "inspect" && <><label>Turn <strong>{Math.round(yaw)}°</strong><input type="range" min="-65" max="65" value={yaw} onChange={(event) => setYaw(Number(event.target.value))} /></label><label>Tilt <strong>{Math.round(pitch)}°</strong><input type="range" min="-40" max="40" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /></label></>}<button type="button" onClick={() => { setYaw(-22); setPitch(13); setZoom(1); }}>Reset view</button></div>
            <div className="studio-preview-footer"><span>{product === "shirts" && !customPhoto ? `${shirtSides.find((side) => side.id === shirtSide)?.label} · ${visibleLayers.length} design layers` : viewMode === "edit" ? "Drag artwork to move it. Use the arrow keys for precise placement." : "Drag to turn the product. Switch to Edit design to move artwork."}</span><div className="studio-preview-actions"><button type="button" onClick={sharePreview}>Save / Share</button><button type="button" onClick={downloadPreview}>Download PNG</button>{canRequest && <a href="#send-design">{canOrder ? "Place order →" : "Get a quote →"}</a>}</div></div>
          </section>
          <aside className="studio-shirt-tools" aria-label={`${catalogName} design tools`}>
            <div className="shirt-tools-heading"><span>DESIGN LAB</span><h2>Make it yours.</h2><p>{customPhoto ? "Decorate the marked area on this product photo." : product === "shirts" ? "Design the front, back, and sleeves of your T-shirt." : `Add a name, logo, or artwork to your ${config.singular}.`}</p></div>
            <div className="shirt-tool-tabs" role="group" aria-label="Design tools">
              {([
                ...(!customPhoto ? [["product", "◉", "Product color"]] as const : []), ["text", "T", "Add text"], ["upload", "↑", "Upload"],
                ["art", "✦", "Add art"], ...(product === "shirts" && !customPhoto ? [["personalize", "#", "Names & numbers"]] as const : []), ["layers", "☷", "Layers"],
              ] as const).map(([id, icon, label]) => <button type="button" key={id} aria-pressed={shirtTool === id} onClick={() => setShirtTool(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}
            </div>
            <div className="shirt-tool-panel">
              {shirtTool === "product" && !customPhoto && <section><h3>Product color</h3><p>Choose a {config.singular} color and preview your design immediately.</p><div className="color-options">{productColors.map((color) => <button type="button" key={color.value} className={productColor === color.value ? "color-swatch active" : "color-swatch"} style={{ backgroundColor: color.value }} aria-label={color.name} aria-pressed={productColor === color.value} title={color.name} onClick={() => { rememberChange(); setProductColor(color.value); }} />)}</div><label className="custom-product-color">Custom {config.singular} color<input type="color" value={productColor} onPointerDown={rememberChange} onChange={(event) => setProductColor(event.target.value)} /></label><span className="tool-hint">{productColors.find((color) => color.value === productColor)?.name ?? productColor.toUpperCase()}</span>{canRequest && <><button className="shirt-secondary-action" type="button" onClick={() => { if (!colorVariants.includes(productColor) && colorVariants.length < 12) { rememberChange(); setColorVariants((current) => [...current, productColor]); } }}>+ Add this color to request</button>{colorVariants.length > 0 && <div className="shirt-color-variants">{colorVariants.map((color) => <button key={color} type="button" title={`Remove ${color}`} onClick={() => { rememberChange(); setColorVariants((current) => current.filter((item) => item !== color)); }}><i style={{ backgroundColor: color }} />{productColors.find((item) => item.value === color)?.name ?? color} ×</button>)}</div>}</>}</section>}
              {shirtTool === "text" && <section><h3>Add text</h3><p>Add a line of text to the {customPhoto ? "marked area" : product === "shirts" ? shirtSides.find((side) => side.id === shirtSide)?.label.toLowerCase() : config.singular}. Select it on the {customPhoto ? "photo" : config.singular} to change the font, shape, outline, and color.</p><button className="shirt-primary-action" type="button" onClick={addText}>+ Add text</button></section>}
              {shirtTool === "upload" && <section><h3>Upload your artwork</h3><p>PNG, JPG, or WebP up to 1 MB. Plain light backgrounds are removed automatically. Transparent PNGs keep their transparency.</p><button className="shirt-primary-action" type="button" onClick={() => shirtUploadRef.current?.click()}>↑ Choose an image</button><input ref={shirtUploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={uploadImage} /><p className="shirt-tool-note">You can also drag an image onto the {customPhoto ? "photo" : config.singular}.</p></section>}
              {shirtTool === "art" && <section><h3>Add art</h3><p>Pick a shape, then place and resize it on the {config.singular}.</p><label className="shirt-art-color">Art color<input type="color" value={artColor} onChange={(event) => setArtColor(event.target.value)} /></label><div className="shirt-art-grid">{artIcons.map((icon) => <button key={icon.id} type="button" onClick={() => addArt(icon)} title={`Add ${icon.name}`}><svg viewBox="0 0 100 100" aria-hidden="true"><path d={icon.path} fill={artColor} /></svg><span>{icon.name}</span></button>)}</div></section>}
              {shirtTool === "personalize" && <section><h3>Names & numbers</h3><p>Add one person at a time. The back preview shows the first entry; all entries are sent to our team.</p><div className="shirt-roster-fields"><label>Name<input value={rosterName} maxLength={40} onChange={(event) => setRosterName(event.target.value)} placeholder="Name" /></label><label>Number<input value={rosterNumber} maxLength={8} onChange={(event) => setRosterNumber(event.target.value)} placeholder="00" /></label><label>Size<select value={rosterSize} onChange={(event) => setRosterSize(event.target.value)}>{["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"].map((size) => <option key={size}>{size}</option>)}</select></label></div><button className="shirt-primary-action" type="button" onClick={addPersonalization}>+ Add person</button>{personalizations.length > 0 && <ul className="shirt-roster-list">{personalizations.map((entry, index) => <li key={`${entry.name}-${entry.number}-${index}`}><span>{entry.name || "—"} · #{entry.number || "—"} · {entry.size}</span><button type="button" onClick={() => removePersonalization(index)} aria-label={`Remove ${entry.name || entry.number}`}>×</button></li>)}</ul>}</section>}
              {shirtTool === "layers" && <section><h3>{product === "shirts" ? shirtSides.find((side) => side.id === shirtSide)?.label : config.name} layers</h3><p>Select a layer to edit or remove it.</p>{visibleLayers.length ? <div className="layer-list">{visibleLayers.map((layer) => <button type="button" key={layer.id} className={layer.id === selectedId ? "active" : ""} onClick={() => setSelectedId(layer.id)}>{layer.kind === "text" ? `T  ${layer.text || "Untitled text"}` : "▧  Artwork"}</button>)}</div> : <p className="shirt-tool-note">No designs on this area yet.</p>}</section>}
            </div>
            {selected && <div className="shirt-selection-editor"><div className="shirt-selection-title"><h3>Edit {selected.kind === "text" ? "text" : "artwork"}</h3><button type="button" onClick={deleteSelected}>Delete</button></div><div className="selected-tools">
              {selected.kind === "text" && <><label>Text<input type="text" maxLength={32} value={selected.text} onFocus={rememberChange} onChange={(event) => updateSelected({ text: event.target.value })} /></label><div className="tool-row"><label>Font<select value={selected.font} onFocus={rememberChange} onChange={(event) => updateSelected({ font: event.target.value as TextLayer["font"] })}><option value="PertySharpSans">Sharp Sans</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option></select></label><label>Text color<input type="color" value={selected.color} onFocus={rememberChange} onChange={(event) => updateSelected({ color: event.target.value })} /></label></div><div className="tool-row"><label>Outline color<input type="color" value={selected.outlineColor ?? "#000000"} onFocus={rememberChange} onChange={(event) => updateSelected({ outlineColor: event.target.value })} /></label><label>Outline width<input type="range" min="0" max="8" step=".5" value={selected.outlineWidth ?? 0} onPointerDown={rememberChange} onChange={(event) => updateSelected({ outlineWidth: Number(event.target.value) })} /><small>{selected.outlineWidth ?? 0}px</small></label></div><label>Text curve<input type="range" min="-100" max="100" value={selected.curve ?? 0} onPointerDown={rememberChange} onChange={(event) => updateSelected({ curve: Number(event.target.value) })} /><small>{selected.curve ?? 0}</small></label></>}
              <label>Size<input type="range" min="0.4" max="2" step="0.05" value={selected.scale} onPointerDown={rememberChange} onChange={(event) => updateSelected({ scale: Number(event.target.value) })} /><small>{Math.round(selected.scale * 100)}%</small></label><label>Rotate<input type="range" min="-60" max="60" value={selected.rotation} onPointerDown={rememberChange} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} /><small>{selected.rotation}°</small></label><div className="studio-placement"><button type="button" onClick={centerSelected}>Center</button><button type="button" onClick={duplicateSelected}>Duplicate</button><button type="button" onClick={() => moveSelected(-1)} disabled={layers[0]?.id === selected.id}>Send back</button><button type="button" onClick={() => moveSelected(1)} disabled={layers[layers.length - 1]?.id === selected.id}>Bring forward</button></div>
            </div></div>}
            <button className="shirt-start-over" type="button" onClick={resetDesign}>Start over</button>
          </aside>
        </div>
        {canRequest && <section className="studio-order-request" id="send-design" aria-labelledby="send-design-title">
          <div><span className="store-kicker">WHEN YOUR DESIGN IS READY</span><h2 id="send-design-title">{canOrder ? "Place your order." : "Send it to our team."}</h2><p>{canOrder ? "Choose your product option, quantity, and pickup or delivery. Review the total before placing an unpaid order. The shop will contact you about payment and fulfillment." : "We will review your design and contact you to confirm options, price, and delivery or pickup. Sending this request does not place a paid order."}</p></div>
          {canOrder && orderOptions ? <OrderCheckout options={orderOptions} minimumQuantity={minimumQuantity} customer={customer} submitting={submitting} error={submitError} placedId={placedId} onPlace={placeOrder} /> : submittedId ? <div className="studio-order-success" role="status"><strong>Design request sent</strong><p>Reference <code>#{submittedId.slice(0, 8)}</code>. Our team can now see your design in the admin panel and will contact you using the email provided.</p><button type="button" onClick={() => { setSubmittedId(null); setSubmitError(null); }}>Send another request</button></div> : <form onSubmit={submitDesign} className="studio-order-form">
            <div className="studio-order-fields"><label>Your name<input name="customer_name" type="text" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Email address<input name="customer_email" type="email" autoComplete="email" required maxLength={254} /></label><label>Phone (optional)<input name="customer_phone" type="tel" autoComplete="tel" maxLength={40} /></label><label>Quantity<input name="quantity" type="number" min={1} max={1000} defaultValue={1} required /></label></div>
            <label>Notes for the team<textarea name="notes" rows={3} maxLength={2000} placeholder="Sizes, deadline, delivery area, or anything else we should know" /></label>
            {submitError && <p className="studio-order-error" role="alert">{submitError}</p>}
            <button type="submit" disabled={submitting}>{submitting ? "Sending design…" : "Send design request"}</button>
          </form>}
        </section>}
        <p className="studio-message" role="status">{message}</p><p className="studio-disclaimer">This editor creates a visual preview and saves your draft in this browser. {canOrder ? "Orders are placed without online payment. The shop will contact you about payment and fulfillment." : canRequest ? "Design requests are reviewed by staff before price, production, or delivery is confirmed." : "This 18+ product cannot be ordered online."}</p>
      </div>
    </main>
  );
}
