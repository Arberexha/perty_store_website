"use client";

import { useState } from "react";
import { acceptQuote } from "./actions";

type Pickup = { id: string; name: string; address: string };
type Zone = { id: string; name: string; fee_cents: number };
const euro = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

export function AcceptQuoteForm({ quoteId, revision, amountCents, pickups, zones }: { quoteId: string; revision: number; amountCents: number; pickups: Pickup[]; zones: Zone[] }) {
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const fee = method === "delivery" ? zones.find((zone) => zone.id === zoneId)?.fee_cents ?? 0 : 0;
  return <form action={acceptQuote} className="quote-decision-form"><input type="hidden" name="id" value={quoteId} /><input type="hidden" name="revision" value={revision} /><input type="hidden" name="expected_shipping_cents" value={fee} />
    <h2>Accept this quote</h2><p>Choose how you want to receive your order. No online payment is taken when you accept.</p>
    <div className="quote-methods" role="group" aria-label="Fulfillment method"><label><input type="radio" name="fulfillment_method" value="pickup" checked={method === "pickup"} onChange={() => setMethod("pickup")} /> Pickup</label><label><input type="radio" name="fulfillment_method" value="delivery" checked={method === "delivery"} onChange={() => setMethod("delivery")} disabled={!zones.length} /> Delivery</label></div>
    {method === "pickup" ? <label>Pickup location<select name="pickup_location_id" defaultValue=""><option value="">Arrange with the shop</option>{pickups.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.address}</option>)}</select></label> : <><label>Delivery zone<select name="shipping_zone_id" value={zoneId} onChange={(event) => setZoneId(event.target.value)} required>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {euro(zone.fee_cents)}</option>)}</select></label><label>Delivery address<textarea name="shipping_address" minLength={5} maxLength={500} rows={3} required placeholder="Street, building, city, and postal code" /></label></>}
    <div className="quote-total"><span>Quoted products <strong>{euro(amountCents)}</strong></span><span>{method === "delivery" ? "Delivery" : "Pickup"} <strong>{euro(fee)}</strong></span><span>Total <strong>{euro(amountCents + fee)}</strong></span></div>
    <button type="submit">Accept quote and place order →</button>
  </form>;
}
