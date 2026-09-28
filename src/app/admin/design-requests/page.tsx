import Link from "next/link";
import { designRequests } from "@/lib/admin/data";
import { dateTime } from "@/lib/admin/format";

const productNames = { pens: "Pens", shirts: "T-shirts", hats: "Hats" };

export default async function DesignRequestsPage() {
  const items = await designRequests();
  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">CUSTOMER DESIGNS</span><h1>Design requests</h1><p>Review submitted artwork and contact the customer to confirm price and production.</p></div></div>
    <section className="admin-panel table-panel"><div className="panel-title"><h2>Submitted designs</h2><span>{items.length} shown</span></div>
      {items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Request</th><th>Customer</th><th>Product</th><th>Quantity</th><th>Status</th><th>Design</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
        <td><strong className="mono">#{item.id.slice(0, 8)}</strong><small>{dateTime(item.created_at)}</small></td>
        <td><strong>{item.customer_name}</strong><small>{item.customer_email}</small></td>
        <td>{(item.product_name ?? productNames[item.product_type])}</td><td>{item.quantity}</td><td><span className="status-pill">{item.status}</span></td>
        <td><Link className="table-link" href={`/admin/design-requests/${item.id}`}>View design →</Link></td>
      </tr>)}</tbody></table></div> : <div className="admin-empty">No designs submitted yet.</div>}
    </section>
  </main>;
}
