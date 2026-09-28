import { customers } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";

export default async function CustomersPage() {
  const items = await customers();
  return <main className="admin-content"><div className="admin-page-heading"><div><span className="admin-kicker">PEOPLE</span><h1>Customers</h1><p>Registered accounts and their order history at a glance.</p></div></div><section className="admin-panel table-panel"><div className="panel-title"><h2>Customer accounts</h2><span>{items.length} shown</span></div>{items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Total ordered</th><th>Joined</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.email}</td><td>{item.order_count}</td><td>{euro(item.total_cents)}</td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table></div> : <div className="admin-empty">No customer accounts yet.</div>}</section></main>;
}
