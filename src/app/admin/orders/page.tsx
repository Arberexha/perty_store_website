import { updateOrder } from "../actions";
import Link from "next/link";
import { AdminNotice } from "@/components/admin-notice";
import { orders } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";

const statuses = ["new", "in_production", "ready", "shipped", "completed", "cancelled"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [items, notice] = await Promise.all([orders(), searchParams]);
  return <main className="admin-content"><div className="admin-page-heading"><div><span className="admin-kicker">OPERATIONS</span><h1>Orders</h1><p>Track production and fulfillment. Payment status comes from the payment provider. Submitted designs are collected as requests until pricing and checkout are confirmed.</p></div><Link className="admin-secondary" href="/admin/design-requests">View design requests →</Link></div><AdminNotice {...notice} /><section className="admin-panel table-panel"><div className="panel-title"><h2>All orders</h2><span>{items.length} shown</span></div>{items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Fulfillment</th><th>Total</th><th>Payment</th><th>Manage</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong className="mono">#{item.id.slice(0, 8)}</strong><small>{dateTime(item.created_at)}</small></td><td><strong>{item.customer_name}</strong><small>{item.customer_email}</small></td><td>{item.item_count}</td><td>{item.fulfillment_method}</td><td>{euro(item.total_cents)}</td><td><span className="status-pill">{item.payment_status ?? "unpaid"}</span></td><td><form action={updateOrder} className="inline-management"><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status} aria-label={`Status for order ${item.id}`}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><input name="admin_note" defaultValue={item.admin_note} placeholder="Internal note" aria-label={`Note for order ${item.id}`} /><button className="admin-secondary" type="submit">Save</button></form></td></tr>)}</tbody></table></div> : <div className="admin-empty">No orders yet. Customer orders will appear here after checkout is connected.</div>}</section></main>;
}
