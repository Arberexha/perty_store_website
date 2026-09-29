import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { dateTime, euro } from "@/lib/admin/format";
import { getPool } from "@/lib/db";
import { pickupLocations, shippingZones } from "@/lib/admin/data";
import { requestQuoteChanges } from "./actions";
import { AcceptQuoteForm } from "./accept-form";
import { ReadQuoteNotification } from "./read-notification";

type QuoteRow = { id: string; status: string; revision: number; details: string; amount_cents: number | null; customer_note: string; sent_at: Date | null; responded_at: Date | null; order_id: string | null; product_name: string | null; product_type: string; quantity: number; preview_height: number; has_proof: boolean };

export default async function CustomerQuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; accepted?: string; changes?: string }> }) {
  const user = await requireUser();
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const [result, pickups, zones] = await Promise.all([
    getPool().query<QuoteRow>(`SELECT q.id,q.status,q.revision,q.details,q.amount_cents,q.customer_note,q.sent_at,q.responded_at,q.order_id,(q.proof_png IS NOT NULL) AS has_proof,
      r.product_name,r.product_type,r.quantity,coalesce((r.design_data->>'previewHeight')::int,420) AS preview_height
      FROM quotes q JOIN design_requests r ON r.id=q.design_request_id WHERE q.id=$1 AND q.user_id=$2 AND r.user_id=$2`, [id, user.id]),
    pickupLocations(), shippingZones(),
  ]);
  const quote = result.rows[0];
  if (!quote) notFound();
  const canDecide = quote.status === "sent" && quote.amount_cents != null;
  return <main className="inner-page customer-quote-page">{quote.status === "sent" && <ReadQuoteNotification id={quote.id} revision={quote.revision} />}<Link className="account-back" href="/account">← My account</Link><span className="eyebrow">CUSTOM PRINT QUOTE</span><h1>Quote #{quote.id.slice(0, 8)}</h1><p>{quote.product_name ?? quote.product_type} · {quote.quantity} items · Revision {quote.revision}{quote.sent_at ? ` · Sent ${dateTime(quote.sent_at)}` : ""}</p>
    {notice.error && <div className="quote-feedback error" role="alert">{notice.error}</div>}{notice.accepted && <div className="quote-feedback" role="status">Quote accepted. Your order is now in your account.</div>}{notice.changes && <div className="quote-feedback" role="status">Your change request was sent to the team.</div>}
    <div className="customer-quote-grid"><div><section className="customer-quote-card"><h2>{quote.has_proof ? "Final proof" : "Submitted design preview"}</h2><Image unoptimized src={`/account/quotes/${quote.id}/preview`} width={1000} height={quote.preview_height} alt={`Design preview for ${quote.product_name ?? quote.product_type}`} /><p>{quote.has_proof ? "Review this proof before accepting. It will be attached to your order." : "Visual preview of your submitted design. The team will confirm production details with you."}</p></section><section className="customer-quote-card"><h2>Offer details</h2><p className="customer-quote-description">{quote.details}</p><div className="quote-offer-price"><span>Product quote</span><strong>{euro(quote.amount_cents)}</strong></div><p>Delivery, if selected, is added when you accept. Payment has not been taken.</p>{quote.customer_note && <div className="quote-prior-note"><strong>Your requested changes</strong><p>{quote.customer_note}</p></div>}</section></div>
    <div>{canDecide ? <><AcceptQuoteForm quoteId={quote.id} revision={quote.revision} amountCents={quote.amount_cents!} pickups={pickups.filter((item) => item.active)} zones={zones.filter((item) => item.active)} /><form action={requestQuoteChanges} className="quote-decision-form quote-changes-form"><input type="hidden" name="id" value={quote.id} /><input type="hidden" name="revision" value={quote.revision} /><h2>Need changes?</h2><p>Tell us what to adjust. We will review it and send an updated quote.</p><label>Your feedback<textarea name="note" minLength={5} maxLength={2000} rows={5} required placeholder="What should we change about the design or quote?" /></label><button type="submit">Request changes</button></form></> : <section className="customer-quote-card quote-status-card"><h2>{quote.status === "accepted" ? "Quote accepted" : quote.status === "changes_requested" ? "Changes requested" : "Quote unavailable"}</h2><p>{quote.status === "accepted" ? "This quote became an order. You can follow its status from your account." : quote.status === "changes_requested" ? "The team is reviewing your feedback. You will be able to decide when a revised quote arrives." : "Contact the shop if you need an update."}</p><Link href="/account">Back to account →</Link></section>}</div></div>
  </main>;
}
