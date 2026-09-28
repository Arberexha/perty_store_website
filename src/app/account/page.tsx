import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { SignOutButton } from "@/components/sign-out-button";
import { getPool } from "@/lib/db";
import { dateTime, euro } from "@/lib/admin/format";

export default async function AccountPage() {
  const user = await requireUser();
  const orders = await getPool().query<{ id: string; status: string; total_cents: number; fulfillment_method: string; created_at: Date; product_names: string }>(`SELECT o.id,o.status,o.total_cents,o.fulfillment_method,o.created_at,string_agg(i.product_name, ', ' ORDER BY i.product_name) AS product_names FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`, [user.id]);
  return <main className="inner-page"><span className="eyebrow">YOUR SPACE</span><h1>Hello, {user.name}.</h1><p>Orders placed while signed in appear here. The shop will contact you about payment and fulfillment.</p><div className="account-card"><div><strong>Account</strong><p>{user.email}</p></div><SignOutButton /></div><section className="account-orders"><h2>Your orders</h2>{orders.rows.length ? <ul>{orders.rows.map((order) => <li key={order.id}><strong>#{order.id.slice(0, 8)} · {order.product_names}</strong><span>{dateTime(order.created_at)} · {order.status.replaceAll("_", " ")} · {order.fulfillment_method} · {euro(order.total_cents)}</span></li>)}</ul> : <p>No orders yet.</p>}</section>{user.role === "admin" && <Link className="button button-primary" href="/admin">Open admin dashboard</Link>}</main>;
}
