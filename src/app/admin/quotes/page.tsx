import Link from "next/link";
import { updateQuote } from "../actions";
import { openDesignRequest } from "../design-requests/actions";
import { AdminNotice } from "@/components/admin-notice";
import { quotes } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";

const statuses = ["all", "new", "reviewing", "sent", "changes_requested", "accepted", "declined"] as const;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; status?: string }> }) {
  const [items, params] = await Promise.all([quotes(), searchParams]);
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status : "all";
  const filtered = status === "all" ? items : items.filter((item) => item.status === status);
  const open = items.filter((item) => item.status === "new" || item.status === "reviewing" || item.status === "changes_requested").length;
  const sent = items.filter((item) => item.status === "sent").length;
  const accepted = items.filter((item) => item.status === "accepted").length;

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">SALES PIPELINE</span><h1>Quotes</h1><p>Record custom requests, prepare offers, and follow up on decisions.</p></div><Link className="admin-primary" href="/admin/quotes/new">Record request <span aria-hidden="true">↗</span></Link></div>
    <AdminNotice {...params} />
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Recent quotes</span></div><div><strong>{open}</strong><span>Need follow up</span></div><div><strong>{sent}</strong><span>Sent</span></div><div><strong>{accepted}</strong><span>Accepted</span></div></div>
    <section className="admin-panel"><div className="panel-title"><div><h2>Quote requests</h2><p>Update an offer as you discuss it with the customer.</p></div><span>{filtered.length} SHOWN</span></div>
      <nav className="admin-filter-chips" aria-label="Filter quotes">{statuses.map((option) => <Link key={option} className={status === option ? "is-active" : ""} href={option === "all" ? "/admin/quotes" : `/admin/quotes?status=${option}`}>{option === "all" ? "All" : option}</Link>)}</nav>
      {filtered.length ? <div className="admin-quote-grid">{filtered.map((item) => <article className="admin-quote-item" key={item.id}>
        <div className="quote-heading"><div><strong>{item.customer_name}</strong><small>{item.customer_email} · {dateTime(item.created_at)}</small></div><span className={item.status === "accepted" ? "status-pill positive" : "status-pill"}>{item.status}</span></div>
        <p>{item.details}</p>{item.design_request_id ? <div className="quote-footer"><span>Offer: {euro(item.amount_cents)} · Revision {item.revision} · Email {item.notification_email_status.replaceAll("_", " ")}</span><form action={openDesignRequest}><input type="hidden" name="id" value={item.design_request_id} /><button className="admin-secondary" type="submit">Review design and quote →</button></form>{item.customer_note && <p>Customer feedback: {item.customer_note}</p>}</div> : <form action={updateQuote} className="admin-form compact-form"><input type="hidden" name="id" value={item.id} /><div className="form-row"><label>Status<select name="status" defaultValue={item.status}>{statuses.filter((value) => value !== "all" && value !== "changes_requested").map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Quoted amount (€)<input name="amount" inputMode="decimal" defaultValue={item.amount_cents == null ? "" : (item.amount_cents / 100).toFixed(2)} placeholder="Not set" /></label></div><label>Internal note<input name="admin_note" defaultValue={item.admin_note} /></label><div className="quote-footer"><span>Current offer: {euro(item.amount_cents)}</span><button className="admin-secondary" type="submit">Save quote</button></div></form>}
      </article>)}</div> : <div className="admin-empty">{items.length ? "No quotes match this status." : "No quote requests yet. Record one to begin tracking it."}</div>}
    </section>
  </main>;
}
