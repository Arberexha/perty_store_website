import Link from "next/link";
import { designRequests } from "@/lib/admin/data";
import { dateTime } from "@/lib/admin/format";

const productNames = { pens: "Pens", shirts: "T-shirts", hats: "Hats" };
const statuses = ["all", "new", "reviewing", "quoted", "closed", "cancelled"] as const;

export default async function DesignRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [items, params] = await Promise.all([designRequests(), searchParams]);
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status : "all";
  const filtered = status === "all" ? items : items.filter((item) => item.status === status);
  const newCount = items.filter((item) => item.status === "new").length;
  const reviewing = items.filter((item) => item.status === "reviewing").length;
  const quoted = items.filter((item) => item.status === "quoted").length;

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">CUSTOMER DESIGNS</span><h1>Design requests</h1><p>Review artwork, confirm quantities, and follow up with customers.</p></div></div>
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Recent requests</span></div><div><strong>{newCount}</strong><span>New</span></div><div><strong>{reviewing}</strong><span>Under review</span></div><div><strong>{quoted}</strong><span>Quoted</span></div></div>
    <section className="admin-panel table-panel"><div className="panel-title"><div><h2>Submitted designs</h2><p>Open a request to view its preview and customer details.</p></div><span>{filtered.length} SHOWN</span></div>
      <nav className="admin-filter-chips" aria-label="Filter design requests">{statuses.map((option) => <Link key={option} className={status === option ? "is-active" : ""} href={option === "all" ? "/admin/design-requests" : `/admin/design-requests?status=${option}`}>{option === "all" ? "All" : option}</Link>)}</nav>
      {filtered.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Request</th><th>Customer</th><th>Product</th><th>Quantity</th><th>Status</th><th>Design</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}>
        <td><Link className="table-link mono" href={`/admin/design-requests/${item.id}`}>#{item.id.slice(0, 8)}</Link><small>{dateTime(item.created_at)}</small></td><td><strong>{item.customer_name}</strong><small>{item.customer_email}</small></td><td>{item.product_name ?? productNames[item.product_type]}</td><td>{item.quantity}</td><td><span className={item.status === "closed" ? "status-pill positive" : "status-pill"}>{item.status}</span></td><td><Link className="table-link" href={`/admin/design-requests/${item.id}`}>Review design ↗</Link></td>
      </tr>)}</tbody></table></div> : <div className="admin-empty">{items.length ? "No requests match this status." : "No designs submitted yet."}</div>}
    </section>
  </main>;
}
