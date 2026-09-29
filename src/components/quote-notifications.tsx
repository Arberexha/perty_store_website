import Link from "next/link";
import { openQuoteNotification } from "@/app/account/quotes/notification-action";

export type QuoteNotification = {
  id: string;
  revision: number;
  product_name: string;
};

export function QuoteNotifications({ notifications, count }: { notifications: QuoteNotification[]; count: number }) {
  return <details className="quote-notifications">
    <summary aria-label={`Quote notifications${count ? `, ${count} unread` : ""}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>
      {count > 0 && <span className="quote-notification-count">{count > 9 ? "9+" : count}</span>}
    </summary>
    <div className="quote-notification-menu">
      <strong>Notifications</strong>
      {notifications.length ? <div className="quote-notification-list">{notifications.map((item) => <form action={openQuoteNotification} key={item.id}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="revision" value={item.revision} />
        <button type="submit"><span className="quote-notification-dot" aria-hidden="true" /><span><b>{item.revision > 1 ? "Your quote was updated" : "Your quote is ready"}</b><small>{item.product_name} · Quote #{item.id.slice(0, 8)}</small></span><span aria-hidden="true">↗</span></button>
      </form>)}</div> : <p>No new notifications.</p>}
      {count > notifications.length && <Link href="/account">View all quotes →</Link>}
    </div>
  </details>;
}
