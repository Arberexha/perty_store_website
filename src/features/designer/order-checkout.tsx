"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import type { OrderOptions } from "@/lib/order-options";
import { orderTotal } from "@/lib/order-pricing";
import { addBusinessDays, readyDayRange } from "@/lib/ready-estimate";
import type { ReadyTiming } from "@/lib/ready-estimate";
import type { ReorderCheckout } from "@/lib/reorder";

export type OrderDetails = {
  customerName: string; customerEmail: string; customerPhone: string; quantity: number; notes: string;
  variantId: string; fulfillmentMethod: "pickup" | "delivery"; pickupLocationId: string | null;
  shippingZoneId: string | null; shippingAddress: string; expectedTotalCents: number; confirmed: true;
};

const money = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function OrderCheckout({ options, minimumQuantity, timing, orderDate, customer, initialOrder, submitting, error, placedId, trackingPath, emailStatus, onPlace }: {
  options: OrderOptions; minimumQuantity: number; timing: ReadyTiming; orderDate: string; customer: { name: string; email: string } | null; initialOrder: ReorderCheckout | null;
  submitting: boolean; error: string | null; placedId: string | null; trackingPath: string | null; emailStatus: "sent" | "failed" | "not_configured" | null; onPlace: (details: OrderDetails) => Promise<void>;
}) {
  const originalVariantAvailable = !initialOrder?.variantId || options.variants.some((item) => item.id === initialOrder.variantId);
  const originalPickupAvailable = !initialOrder?.pickupLocationId || options.pickup.some((item) => item.id === initialOrder.pickupLocationId);
  const originalDeliveryAvailable = !initialOrder || initialOrder.fulfillmentMethod !== "delivery" || initialOrder.shippingZoneId !== null && options.shipping.some((item) => item.id === initialOrder.shippingZoneId);
  const [variantId, setVariantId] = useState(originalVariantAvailable ? initialOrder?.variantId ?? options.variants[0]?.id ?? "" : options.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(Math.max(minimumQuantity, initialOrder?.quantity ?? minimumQuantity));
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">(initialOrder?.fulfillmentMethod === "delivery" && options.shipping.length ? "delivery" : "pickup");
  const [pickupLocationId, setPickupLocationId] = useState(originalPickupAvailable ? initialOrder?.pickupLocationId ?? options.pickup[0]?.id ?? "" : options.pickup[0]?.id ?? "");
  const [shippingZoneId, setShippingZoneId] = useState(originalDeliveryAvailable ? initialOrder?.shippingZoneId ?? options.shipping[0]?.id ?? "" : options.shipping[0]?.id ?? "");
  const [year, month, day] = orderDate.split("-").map(Number);
  const today = new Date(year, month - 1, day);
  const variant = options.variants.find((item) => item.id === variantId) ?? options.variants[0];
  const shipping = options.shipping.find((item) => item.id === shippingZoneId);
  const price = orderTotal(variant.base_price_cents, variant.tiers, quantity || minimumQuantity, fulfillmentMethod === "delivery" ? shipping?.fee_cents ?? 0 : 0);
  const ready = readyDayRange(timing, quantity, fulfillmentMethod === "delivery" ? { min: shipping?.transit_min_days ?? null, max: shipping?.transit_max_days ?? null } : null);
  const dateLabel = (days: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(addBusinessDays(today, days));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || placedId) return;
    const form = new FormData(event.currentTarget);
    void onPlace({
      customerName: String(form.get("customer_name") ?? "").trim(),
      customerEmail: String(form.get("customer_email") ?? "").trim(),
      customerPhone: String(form.get("customer_phone") ?? "").trim(),
      notes: String(form.get("notes") ?? "").trim(), quantity,
      variantId: variant.id, fulfillmentMethod,
      pickupLocationId: fulfillmentMethod === "pickup" ? pickupLocationId || null : null,
      shippingZoneId: fulfillmentMethod === "delivery" ? shippingZoneId || null : null,
      shippingAddress: fulfillmentMethod === "delivery" ? String(form.get("shipping_address") ?? "").trim() : "",
      expectedTotalCents: price.totalCents, confirmed: true,
    });
  }

  if (placedId) return <div className="studio-order-success" role="status"><strong>Order placed</strong><p>Reference <code>#{placedId.slice(0, 8)}</code>. {emailStatus === "sent" ? "A confirmation email with your design preview and order details was sent to your email address." : "A confirmation email could not be sent; please save your tracking link."} Your order is unpaid; the shop will contact you about payment and fulfillment.</p>{trackingPath && <p><Link href={trackingPath}>Track your order →</Link><br /><small>Save this private link. Anyone with it can view your order progress.</small></p>}</div>;

  return <form onSubmit={submit} className="studio-order-form">
    {initialOrder && <p className="studio-reorder-notice">Review the current price and availability before placing this new order.{!originalVariantAvailable ? " Your previous product option is unavailable, so another option was selected." : ""}{initialOrder.fulfillmentMethod === "delivery" && !options.shipping.length ? " Delivery is currently unavailable, so pickup was selected." : ""}{!originalPickupAvailable || !originalDeliveryAvailable ? " A previous pickup or delivery location is unavailable, so another was selected." : ""}</p>}
    <div className="studio-order-fields">
      <label>Product option<select value={variantId} onChange={(event) => setVariantId(event.target.value)}>{options.variants.map((item) => <option key={item.id} value={item.id}>{item.label} · {money(item.base_price_cents)} base</option>)}</select></label>
      <label>Quantity<input name="quantity" type="number" min={minimumQuantity} max={1000} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /></label>
      <label>Your name<input name="customer_name" type="text" autoComplete="name" defaultValue={customer?.name ?? ""} required minLength={2} maxLength={120} /></label>
      <label>Email address<input name="customer_email" type="email" autoComplete="email" defaultValue={customer?.email ?? ""} required maxLength={254} /></label>
      <label>Phone<input name="customer_phone" type="tel" autoComplete="tel" defaultValue={initialOrder?.customerPhone ?? ""} required minLength={5} maxLength={40} /></label>
      <label>Fulfillment<select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "pickup" | "delivery")}><option value="pickup">Pickup</option>{options.shipping.length > 0 && <option value="delivery">Delivery</option>}</select></label>
    </div>
    {fulfillmentMethod === "pickup" ? <label>Pickup location<select value={pickupLocationId} onChange={(event) => setPickupLocationId(event.target.value)}>{options.pickup.length ? options.pickup.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.address}</option>) : <option value="">Arrange with shop</option>}</select></label> : <><label>Delivery zone<select value={shippingZoneId} onChange={(event) => setShippingZoneId(event.target.value)} required>{options.shipping.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.fee_cents)}</option>)}</select></label><label>Delivery address<textarea name="shipping_address" rows={3} minLength={10} maxLength={500} required defaultValue={initialOrder?.shippingAddress ?? ""} placeholder="Street, city, postal code, country" /></label></>}
    <label>Notes for the team<textarea name="notes" rows={3} maxLength={2000} defaultValue={initialOrder?.notes ?? ""} placeholder="Size details, deadline, or other instructions" /></label>
    <div className="studio-order-totals"><span>{quantity} × {money(price.unitPriceCents)}</span><strong>{money(price.subtotalCents)}</strong><span>{fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}</span><strong>{money(price.shippingCents)}</strong><span>Total</span><strong>{money(price.totalCents)}</strong></div>
    <div className="studio-ready-estimate" aria-live="polite"><strong>{fulfillmentMethod === "pickup" ? "Estimated ready for pickup" : ready?.deliveryIncluded ? "Estimated delivery" : "Estimated production ready"}</strong>{ready ? <><span>{dateLabel(ready.min)}{ready.max === ready.min ? "" : `–${dateLabel(ready.max)}`}</span><small>{fulfillmentMethod === "delivery" && !ready.deliveryIncluded ? "Delivery transit time will be confirmed by the shop. " : ""}This is an estimate from today; the shop will confirm timing after reviewing your order. Business days exclude weekends.</small></> : <span>Timing will be confirmed by the shop after you place your order.</span>}</div>
    <label className="studio-order-confirm"><input type="checkbox" required />I confirm the design, quantity, and total shown above. I understand payment will be arranged with the shop.</label>
    {error && <p className="studio-order-error" role="alert">{error}</p>}
    <button type="submit" disabled={submitting}>{submitting ? "Placing order…" : `Place order · ${money(price.totalCents)}`}</button>
  </form>;
}
