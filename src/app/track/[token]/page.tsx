import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool } from "@/lib/db";
import { orderStatusLabel, type OrderStatus } from "@/lib/order-tracking";
import styles from "./tracking.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Track your order | Perty Print", robots: { index: false, follow: false } };

type OrderRow = { id: string; status: OrderStatus; fulfillment_method: "pickup" | "delivery"; total_cents: number; created_at: Date };
type ItemRow = { product_name: string; variant_label: string; quantity: number };
type EventRow = { id: number; status: OrderStatus; created_at: Date };
const money = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Budapest" }).format(value);

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const order = (await getPool().query<OrderRow>(
    "SELECT id,status,fulfillment_method,total_cents,created_at FROM orders WHERE tracking_token=$1", [token],
  )).rows[0];
  if (!order) notFound();
  const [items, events] = await Promise.all([
    getPool().query<ItemRow>("SELECT product_name,variant_label,quantity FROM order_items WHERE order_id=$1 ORDER BY id", [order.id]),
    getPool().query<EventRow>("SELECT id,status,created_at FROM order_status_events WHERE order_id=$1 ORDER BY id DESC", [order.id]),
  ]);
  const reference = order.id.slice(0, 8).toUpperCase();
  return <main className={styles.page}>
    <meta name="referrer" content="no-referrer" />
    <div className={styles.shell}>
      <Link className={styles.back} href="/">← Perty Print</Link>
      <header className={styles.heading}><span className={styles.eyebrow}>ORDER TRACKING</span><h1>Your order, at a glance.</h1><p>Order #{reference} · Placed {date(order.created_at)}</p></header>
      <section className={styles.statusCard} aria-label="Current order status">
        <span>Current status</span><strong>{orderStatusLabel(order.status, order.fulfillment_method)}</strong>
        <p>{order.status === "cancelled" ? "This order has been cancelled. Reply to your order email if you have questions." : order.status === "completed" ? "Your order is complete. Thank you for choosing Perty Print." : "We will email you when the next update is available."}</p>
      </section>
      <div className={styles.grid}>
        <section className={styles.panel}><h2>Progress</h2><ol className={styles.timeline}>{events.rows.map((event) => <li key={event.id}><span className={styles.dot} aria-hidden="true" /><div><strong>{orderStatusLabel(event.status, order.fulfillment_method)}</strong><time dateTime={event.created_at.toISOString()}>{date(event.created_at)}</time></div></li>)}</ol></section>
        <section className={styles.panel}><h2>Order summary</h2><ul className={styles.items}>{items.rows.map((item, index) => <li key={index}><strong>{item.product_name}</strong><span>{item.variant_label} · Qty {item.quantity}</span></li>)}</ul><div className={styles.total}><span>Total</span><strong>{money(order.total_cents)}</strong></div><p className={styles.help}>{order.fulfillment_method === "pickup" ? "Pickup" : "Delivery"} · Payment is arranged with the shop. No online payment was taken.</p></section>
      </div>
      <p className={styles.privacy}>This is a private link. Anyone with it can view this order’s progress.</p>
    </div>
  </main>;
}
