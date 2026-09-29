import Link from "next/link";
import { AdminNotice } from "@/components/admin-notice";
import { orders } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";

const statuses = ["all", "new", "in_production", "ready", "shipped", "completed", "cancelled"] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; status?: string }> }) {
  const [items, params] = await Promise.all([orders(), searchParams]);
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status : "all";
  const filtered = status === "all" ? items : items.filter((item) => item.status === status);
  const open = items.filter((item) => item.status === "new" || item.status === "in_production").length;
  const ready = items.filter((item) => item.status === "ready").length;
  const unpaid = items.filter((item) => item.payment_status !== "paid" && item.status !== "cancelled").length;

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">OPERATIONS</span><h1>Orders</h1><p>Track production, payment, and fulfillment from one place.</p></div><Link className="admin-secondary" href="/admin/design-requests">Design requests ↗</Link></div>
    <AdminNotice {...params} />
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Recent orders</span></div><div><strong>{open}</strong><span>To process</span></div><div><strong>{ready}</strong><span>Ready to fulfill</span></div><div><strong>{unpaid}</strong><span>Payment outstanding</span></div></div>
    <section className="admin-panel table-panel"><div className="panel-title"><div><h2>Order queue</h2><p>Open an order to review designs and update its status.</p></div><span>{filtered.length} SHOWN</span></div>
      <nav className="admin-filter-chips" aria-label="Filter orders by status">{statuses.map((option) => <Link key={option} className={status === option ? "is-active" : ""} href={option === "all" ? "/admin/orders" : `/admin/orders?status=${option}`}>{option === "all" ? "All" : option.replaceAll("_", " ")}</Link>)}</nav>
      {filtered.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Fulfillment</th><th>Total</th><th>Payment</th><th>Status</th><th>Open</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}>
        <td><Link className="table-link mono" href={`/admin/orders/${item.id}`}>#{item.id.slice(0, 8)}</Link><small>{dateTime(item.created_at)}</small></td><td><strong>{item.customer_name}</strong><small>{item.customer_email}</small></td><td>{item.item_count}</td><td>{item.fulfillment_method}</td><td><strong>{euro(item.total_cents)}</strong></td><td><span className={item.payment_status === "paid" ? "status-pill positive" : "status-pill"}>{item.payment_status ?? "unpaid"}</span></td><td><span className={item.status === "completed" ? "status-pill positive" : item.status === "cancelled" ? "status-pill restricted" : "status-pill"}>{item.status.replaceAll("_", " ")}</span></td><td><Link className="table-link" href={`/admin/orders/${item.id}`}>Manage ↗</Link></td>
      </tr>)}</tbody></table></div> : <div className="admin-empty">{items.length ? "No orders match this status." : "No orders yet. They will appear when customers place orders."}</div>}
    </section>
  </main>;
}
