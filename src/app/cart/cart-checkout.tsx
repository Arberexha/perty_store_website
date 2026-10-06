"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { cartItems, clearCart, removeCartItem, saveCartItem } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";
import type { OrderOptions } from "@/lib/order-options";
import type { ReadyTiming, OrderReadyEstimate } from "@/lib/ready-estimate";
import { addBusinessDays, combinedReadyDayRange } from "@/lib/ready-estimate";
import { orderTotal } from "@/lib/order-pricing";
import { ORDER_ANNOUNCEMENT_EVENT, ORDER_ANNOUNCEMENT_KEY } from "@/lib/order-announcement";
import type { OrderAnnouncement } from "@/lib/order-announcement";

type Product = { id: string; name: string; slug: string; minimumQuantity: number; timing: ReadyTiming; options: OrderOptions };
const money = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function CartCheckout({ products, customer, orderDate }: { products: Product[]; customer: { name: string; email: string } | null; orderDate: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; trackingPath: string | null; emailStatus: string } | null>(null);
  const pickup = products[0]?.options.pickup ?? [];
  const shipping = products[0]?.options.shipping ?? [];
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [pickupLocationId, setPickupLocationId] = useState(pickup[0]?.id ?? "");
  const [shippingZoneId, setShippingZoneId] = useState(shipping[0]?.id ?? "");

  useEffect(() => { void cartItems().then((found) => { setItems(found); setLoaded(true); }).catch(() => { setError("This browser could not open your cart."); setLoaded(true); }); }, []);

  const entries = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.catalogProductId);
    const variant = product?.options.variants.find((candidate) => candidate.id === item.variantId) ?? product?.options.variants[0];
    const validQuantity = Boolean(product && Number.isInteger(item.quantity) && item.quantity >= product.minimumQuantity && item.quantity <= 1000 && (!item.personalizations?.length || item.personalizations.length === item.quantity));
    return { item, product, variant, validQuantity, price: variant ? orderTotal(variant.base_price_cents, variant.tiers, item.quantity, 0) : null };
  });
  const unavailable = entries.some((entry) => !entry.product || !entry.variant || !entry.validQuantity);
  const selectedZone = shipping.find((zone) => zone.id === shippingZoneId);
  const subtotal = entries.reduce((sum, entry) => sum + (entry.price?.subtotalCents ?? 0), 0);
  const delivery = fulfillmentMethod === "delivery" ? selectedZone?.fee_cents ?? 0 : 0;
  const total = subtotal + delivery;
  const ready = unavailable ? null : combinedReadyDayRange(entries.map((entry) => ({ timing: entry.product!.timing, quantity: entry.item.quantity })), fulfillmentMethod, fulfillmentMethod === "delivery" ? { min: selectedZone?.transit_min_days ?? null, max: selectedZone?.transit_max_days ?? null } : null);
  const [year, month, day] = orderDate.split("-").map(Number);
  const today = new Date(year, month - 1, day);
  const dateLabel = (days: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(addBusinessDays(today, days));

  async function changeItem(item: CartItem, patch: Partial<CartItem>) {
    const updated = { ...item, ...patch };
    try { await saveCartItem(updated); setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry)); setError(null); }
    catch { setError("Could not save this cart change. Please try again."); }
  }

  async function removeItem(id: string) {
    try { await removeCartItem(id); setItems((current) => current.filter((item) => item.id !== id)); setError(null); }
    catch { setError("Could not remove this design. Please try again."); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || unavailable || !items.length || placed) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        items: entries.map(({ item, variant }) => ({ product: item.product, catalogProductId: item.catalogProductId, variantId: variant!.id, quantity: item.quantity, productColor: item.productColor,
          layers: item.layers, personalizations: item.personalizations, previewSide: item.previewSide, previewHeight: item.previewHeight, productColors: item.productColors, previewPng: item.previewPng })),
        customerName: String(form.get("customer_name") ?? "").trim(), customerEmail: String(form.get("customer_email") ?? "").trim(), customerPhone: String(form.get("customer_phone") ?? "").trim(),
        notes: String(form.get("notes") ?? "").trim(), fulfillmentMethod,
        pickupLocationId: fulfillmentMethod === "pickup" ? pickupLocationId || null : null,
        shippingZoneId: fulfillmentMethod === "delivery" ? shippingZoneId || null : null,
        shippingAddress: fulfillmentMethod === "delivery" ? String(form.get("shipping_address") ?? "").trim() : "",
        expectedTotalCents: total, confirmed: true,
      };
      const response = await fetch("/api/cart/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null) as { id?: string; trackingPath?: string; emailStatus?: string; readyEstimate?: OrderReadyEstimate | null; error?: string } | null;
      if (!response.ok || !result?.id) throw new Error(result?.error ?? "Could not place the cart order.");
      setPlaced({ id: result.id, trackingPath: result.trackingPath ?? null, emailStatus: result.emailStatus ?? "failed" });
      await clearCart().catch(() => { /* The order is placed; a storage failure must not change that result. */ });
      setItems([]);
      const announcement: OrderAnnouncement = { id: result.id, trackingPath: result.trackingPath ?? null, readyEstimate: result.readyEstimate ?? null };
      try { window.sessionStorage.setItem(ORDER_ANNOUNCEMENT_KEY, JSON.stringify(announcement)); } catch { /* Banner still appears this visit. */ }
      window.dispatchEvent(new CustomEvent(ORDER_ANNOUNCEMENT_EVENT, { detail: announcement }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not place the cart order."); }
    finally { setSubmitting(false); }
  }

  if (!loaded) return <p role="status">Opening your cart…</p>;
  if (placed) return <section className="cart-success" role="status"><h2>Order placed</h2><p>Reference #{placed.id.slice(0, 8)}. Your designs are together in one unpaid order. {placed.emailStatus === "sent" ? "A confirmation email was sent." : "Please save your private tracking link."}</p>{placed.trackingPath && <Link href={placed.trackingPath}>Track your order →</Link>}</section>;
  if (!items.length) return <section className="cart-empty"><h2>Your cart is empty.</h2><p>Choose a product, add your design, then select “Add design to cart.”</p><Link className="button button-primary" href="/#products">Explore products →</Link>{error && <p role="alert">{error}</p>}</section>;

  return <form onSubmit={submit} className="cart-layout"><div className="cart-items"><h2>Designs ({items.length})</h2>{entries.map(({ item, product, variant, validQuantity, price }) => <article className="cart-item" key={item.id}><Image src={item.previewPng} alt={`${item.productName} design preview`} width={320} height={150} unoptimized /><div className="cart-item-info"><h3>{product?.name ?? item.productName}</h3>{product && variant ? <><label>Product option<select value={variant.id} onChange={(event) => void changeItem(item, { variantId: event.target.value })}>{product.options.variants.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>{variant.id !== item.variantId && <small>Previous option unavailable; review this selection.</small>}<label>Quantity<input type="number" min={product.minimumQuantity} max="1000" value={item.quantity} disabled={Boolean(item.personalizations?.length)} onChange={(event) => void changeItem(item, { quantity: Number(event.target.value) })} /></label>{item.personalizations?.length ? <small>To change the team roster or quantity, create a new design.</small> : null}{!validQuantity && <small className="cart-warning">Quantity must be between {product.minimumQuantity} and 1000.</small>}<strong>{money(price!.subtotalCents)}</strong></> : <p className="cart-warning">This product is no longer available for online orders.</p>}<div className="cart-item-actions"><Link href={`/design/${encodeURIComponent(item.productSlug)}`}>Design another</Link><button type="button" onClick={() => void removeItem(item.id)}>Remove</button></div></div></article>)}<Link className="cart-more" href="/#products">+ Add another design</Link></div>
    <div className="cart-summary"><h2>One checkout</h2><div className="cart-fields"><label>Your name<input name="customer_name" defaultValue={customer?.name ?? ""} required minLength={2} maxLength={120} autoComplete="name" /></label><label>Email address<input name="customer_email" type="email" defaultValue={customer?.email ?? ""} required maxLength={254} autoComplete="email" /></label><label>Phone<input name="customer_phone" type="tel" required minLength={5} maxLength={40} /></label><label>Fulfillment<select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "pickup" | "delivery")}><option value="pickup">Pickup</option>{shipping.length > 0 && <option value="delivery">Delivery</option>}</select></label>{fulfillmentMethod === "pickup" ? <label>Pickup location<select value={pickupLocationId} onChange={(event) => setPickupLocationId(event.target.value)}>{pickup.length ? pickup.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.address}</option>) : <option value="">Arrange with shop</option>}</select></label> : <><label>Delivery zone<select value={shippingZoneId} onChange={(event) => setShippingZoneId(event.target.value)} required>{shipping.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {money(zone.fee_cents)}</option>)}</select></label><label>Delivery address<textarea name="shipping_address" rows={3} minLength={10} maxLength={500} required /></label></>}<label>Notes for the team<textarea name="notes" rows={3} maxLength={2000} /></label></div><div className="cart-totals"><span>Designs</span><strong>{money(subtotal)}</strong><span>{fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}</span><strong>{money(delivery)}</strong><span>Total</span><strong>{money(total)}</strong></div><div className="cart-estimate"><strong>{fulfillmentMethod === "pickup" ? "Estimated ready for pickup" : ready?.deliveryIncluded ? "Estimated delivery" : "Estimated production ready"}</strong><span>{ready ? `${dateLabel(ready.min)}${ready.max === ready.min ? "" : `–${dateLabel(ready.max)}`}` : "Timing will be confirmed by the shop."}</span><small>{ready && fulfillmentMethod === "delivery" && !ready.deliveryIncluded ? "Delivery transit time will be confirmed. " : ""}The shop confirms timing after reviewing the order.</small></div><label className="cart-confirm"><input type="checkbox" required />I confirm all designs, quantities, and the total above. Payment will be arranged with the shop.</label>{error && <p className="cart-error" role="alert">{error}</p>}<button className="cart-submit" type="submit" disabled={submitting || unavailable || total > 2_147_483_647}>{submitting ? "Placing order…" : `Place one order · ${money(total)}`}</button></div></form>;
}
