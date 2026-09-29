import { customers } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";

export default async function CustomersPage() {
  const items = await customers();
  const ordered = items.filter((item) => item.order_count > 0).length;
  const newThisMonth = items.filter((item) => item.is_recent).length;
  const totalOrdered = items.reduce((sum, item) => sum + Number(item.total_cents), 0);

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">PEOPLE</span><h1>Customers</h1><p>See who has registered, who has ordered, and each account&apos;s order history.</p></div></div>
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Recent accounts</span></div><div><strong>{newThisMonth}</strong><span>Joined in the last 30 days</span></div><div><strong>{ordered}</strong><span>Customers with orders</span></div><div><strong>{euro(totalOrdered)}</strong><span>Orders from shown accounts</span></div></div>
    <section className="admin-panel table-panel"><div className="panel-title"><h2>Customer accounts</h2><span>{items.length} shown</span></div>{items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Total ordered</th><th>Joined</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td><a className="table-link" href={`mailto:${item.email}`}>{item.email}</a></td><td>{item.order_count}</td><td>{euro(item.total_cents)}</td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table></div> : <div className="admin-empty">Customer accounts will appear here after registration.</div>}</section>
  </main>;
}
