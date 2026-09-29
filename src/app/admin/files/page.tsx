import Link from "next/link";
import { reviewArtwork } from "../actions";
import { AdminNotice } from "@/components/admin-notice";
import { artwork } from "@/lib/admin/data";
import { dateTime } from "@/lib/admin/format";

const statuses = ["all", "pending", "approved", "rejected"] as const;

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; status?: string }> }) {
  const [items, notice] = await Promise.all([artwork(), searchParams]);
  const selected = statuses.find((status) => status === notice.status) ?? "all";
  const shown = selected === "all" ? items : items.filter((item) => item.status === selected);
  const pending = items.filter((item) => item.status === "pending").length;
  const approved = items.filter((item) => item.status === "approved").length;
  const rejected = items.filter((item) => item.status === "rejected").length;

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">DESIGN STUDIO</span><h1>Artwork files</h1><p>Review artwork submitted by customers and keep production files organized.</p></div></div>
    <AdminNotice {...notice} />
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Recent files</span></div><div><strong>{pending}</strong><span>Awaiting review</span></div><div><strong>{approved}</strong><span>Approved</span></div><div><strong>{rejected}</strong><span>Rejected</span></div></div>
    <nav className="admin-filter-chips" aria-label="Filter artwork by status">{statuses.map((status) => <Link key={status} href={status === "all" ? "/admin/files" : `/admin/files?status=${status}`} className={selected === status ? "is-active" : ""} aria-current={selected === status ? "page" : undefined}>{status}</Link>)}</nav>
    <section className="admin-panel table-panel"><div className="panel-title"><h2>Customer files</h2><span>{shown.length} shown</span></div>{shown.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>File</th><th>Customer</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Review</th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td><strong>{item.original_name}</strong></td><td>{item.customer_email ?? "Guest"}</td><td>{item.mime_type}</td><td>{(Number(item.size_bytes) / 1024 / 1024).toFixed(1)} MB</td><td>{dateTime(item.created_at)}</td><td><form action={reviewArtwork} className="inline-management"><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status} aria-label={`Review status for ${item.original_name}`}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button className="admin-secondary" type="submit">Save</button></form></td></tr>)}</tbody></table></div> : <div className="admin-empty">{items.length ? `No ${selected} artwork files.` : "Customer artwork will appear here when submitted."}</div>}</section>
  </main>;
}
