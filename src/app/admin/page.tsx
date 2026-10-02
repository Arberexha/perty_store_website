import Link from "next/link";
import { openDesignRequest } from "./design-requests/actions";
import { openOrder } from "./orders/actions";
import { dashboard } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";
import { AdminChart } from "@/components/admin-chart";
import { AdminIcon } from "@/components/admin-icon";
import type { AdminIconName } from "@/components/admin-icon";
import { requireAdmin } from "@/lib/auth/guard";

const stageLabels: Record<string, string> = {
  new: "New", in_production: "In production", ready: "Ready", shipped: "Shipped", completed: "Completed", cancelled: "Cancelled",
};

export default async function AdminPage() {
  const [overview, user] = await Promise.all([dashboard(), requireAdmin()]);
  const { counts, recent, activity, trends, recentDesigns, topProducts, orderStages } = overview;
  const openWork = counts.pending_orders + counts.pending_design_requests + counts.quotes;
  const metrics: { label: string; value: string | number; detail: string; href: string; icon: AdminIconName }[] = [
    { label: "Revenue · 30 days", value: euro(counts.revenue_30_cents), detail: `${euro(counts.revenue_cents)} all time`, href: "/admin/orders", icon: "revenue" },
    { label: "Orders · 30 days", value: counts.orders_30, detail: `${counts.orders} all time`, href: "/admin/orders", icon: "orders" },
    { label: "Needs action", value: openWork, detail: "Orders, designs, and quotes", href: "/admin/orders", icon: "designs" },
    { label: "Published products", value: counts.published_products, detail: `${counts.products} total · ${counts.orderable_products} orderable`, href: "/admin/products", icon: "products" },
  ];
  const queue = [
    { label: "Orders to process", detail: "New or in production", count: counts.pending_orders, href: "/admin/orders", icon: "orders" as const },
    { label: "Designs to review", detail: "New or under review", count: counts.pending_design_requests, href: "/admin/design-requests", icon: "designs" as const },
    { label: "Open quotes", detail: "Awaiting an offer or response", count: counts.quotes, href: "/admin/quotes", icon: "quotes" as const },
  ];
  const maxStage = Math.max(1, ...orderStages.map((stage) => stage.total));

  return <main className="admin-content admin-dashboard">
    <div className="admin-page-heading">
      <div><span className="admin-kicker">SHOP OVERVIEW</span><h1>Good day, {user.name}.</h1><p>Here is what is happening across your store today.</p></div>
      <Link className="admin-primary" href="/admin/products/new">Add product <span aria-hidden="true">↗</span></Link>
    </div>

    <div className="metric-grid">{metrics.map((metric) => <Link className="metric-card" href={metric.href} key={metric.label}>
      <div><span>{metric.label}</span><b><AdminIcon name={metric.icon} /></b></div>
      <strong>{metric.value}</strong><small>{metric.detail}</small>
    </Link>)}</div>

    <div className="admin-dashboard-grid">
      <section className="admin-panel admin-queue"><div className="panel-title"><div><h2>Work to follow up</h2><p>Start with the items waiting for your team.</p></div><span>{openWork} OPEN</span></div>
        {queue.map((item) => <Link className="admin-queue-row" href={item.href} key={item.label}>
          <span className="admin-queue-icon"><AdminIcon name={item.icon} /></span><span className="admin-queue-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><b>{item.count}</b><span aria-hidden="true">↗</span>
        </Link>)}
      </section>
      <section className="admin-panel admin-health"><div className="panel-title"><div><h2>Catalogue readiness</h2><p>What is live, and what still needs setup.</p></div><Link href="/admin/products">Open catalogue ↗</Link></div>
        <div className="admin-health-grid"><div><strong>{counts.published_products}</strong><span>Published</span></div><div><strong>{counts.draft_products}</strong><span>Drafts</span></div><div><strong>{counts.orderable_products}</strong><span>Orderable</span></div></div>
        <div className="admin-health-row"><span>Products without variants</span><strong>{counts.products_without_variants}</strong></div>
        <div className="admin-health-row"><span>Products without an active price</span><strong>{counts.products_without_prices}</strong></div>
        <Link className="admin-health-link" href="/admin/products">Review product setup <span aria-hidden="true">↗</span></Link>
      </section>
    </div>

    <div className="chart-grid"><AdminChart title="Order activity" points={trends} field="order_count" /><AdminChart title="Paid revenue" points={trends} field="revenue_cents" /></div>

    <div className="admin-dashboard-grid">
      <section className="admin-panel"><div className="panel-title"><div><h2>Order pipeline</h2><p>Current status of every order.</p></div><Link href="/admin/orders">View orders ↗</Link></div>
        <div className="admin-pipeline">{Object.entries(stageLabels).map(([status, label]) => {
          const total = orderStages.find((stage) => stage.status === status)?.total ?? 0;
          return <div className="admin-pipeline-row" key={status}><span>{label}</span><div className="admin-pipeline-track"><span style={{ width: `${total / maxStage * 100}%` }} /></div><strong>{total}</strong></div>;
        })}</div>
      </section>
      <section className="admin-panel"><div className="panel-title"><div><h2>Recently submitted designs</h2><p>Customer artwork requests.</p></div><Link href="/admin/design-requests">View all ↗</Link></div>
        {recentDesigns.length ? <div className="admin-recent-list">{recentDesigns.map((request) => <form action={openDesignRequest} key={request.id}><input type="hidden" name="id" value={request.id} /><button type="submit">
          <span><strong>{request.customer_name}</strong><small>{request.product_name ?? request.product_type} · {dateTime(request.created_at)}</small></span><span className="status-pill">{request.status}</span>
        </button></form>)}</div> : <div className="admin-empty">No design requests yet.</div>}
      </section>
    </div>

    <section className="admin-panel table-panel"><div className="panel-title"><div><h2>Recent orders</h2><p>Latest customer purchases and payment status.</p></div><Link href="/admin/orders">View all ↗</Link></div>
      {recent.length ? <div className="admin-table-wrap"><table className="admin-table orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>{recent.map((order) => <tr key={order.id} className={order.admin_viewed_at ? undefined : "is-unread"}>
        <td><form action={openOrder} className="order-open-form"><input type="hidden" name="id" value={order.id} /><button className="table-link mono" type="submit">#{order.id.slice(0, 8)}</button></form>{!order.admin_viewed_at && <span className="order-unread">Unread</span>}</td><td><strong>{order.customer_name}</strong><small>{order.customer_email}</small></td><td>{order.item_count}</td><td>{euro(order.total_cents)}</td><td><span className="status-pill">{order.payment_status ?? "unpaid"}</span></td><td><span className="status-pill">{order.status.replaceAll("_", " ")}</span></td><td>{dateTime(order.created_at)}</td>
      </tr>)}</tbody></table></div> : <div className="admin-empty">No orders yet. Orders will appear here when customers start checking out.</div>}
    </section>

    <div className="admin-dashboard-grid admin-dashboard-bottom">
      <section className="admin-panel"><div className="panel-title"><div><h2>Most ordered products</h2><p>Ranked by units across all orders.</p></div><Link href="/admin/products">View products ↗</Link></div>
        {topProducts.length ? <ol className="admin-top-products">{topProducts.map((item) => <li key={item.product_name}><span><strong>{item.product_name}</strong><small>{item.units} units ordered</small></span><b>{euro(item.total_cents)}</b></li>)}</ol> : <div className="admin-empty">Product rankings will appear after the first order.</div>}
      </section>
      <section className="admin-panel audit-panel"><div className="panel-title"><div><h2>Team activity</h2><p>Recent catalogue and order changes.</p></div><span>{counts.new_customers_30} NEW CUSTOMERS · 30 DAYS</span></div>
        {activity.length ? <ul>{activity.map((event) => <li key={event.id}><span className="audit-dot" /><strong>{event.action} {event.entity_type.replaceAll("_", " ")}</strong><time>{dateTime(event.created_at)}</time></li>)}</ul> : <div className="admin-empty">Your team&apos;s changes will appear here.</div>}
      </section>
    </div>
  </main>;
}
