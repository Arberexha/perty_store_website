import type { Metadata } from "next";
import Link from "next/link";
import MotionEffects from "@/components/motion-effects";
import { QuoteNotificationRefresh } from "@/components/quote-notification-refresh";
import { QuoteNotifications, type QuoteNotification } from "@/components/quote-notifications";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perty Print — Make it yours",
  description: "Custom printed goods, designed by you in Kosovo.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const unread = user ? await getPool().query<QuoteNotification & { unread_count: number }>(
    `SELECT q.id,q.revision,coalesce(r.product_name,r.product_type) AS product_name,count(*) OVER ()::int AS unread_count
     FROM quotes q JOIN design_requests r ON r.id=q.design_request_id
     WHERE q.user_id=$1 AND r.user_id=$1 AND q.status='sent' AND q.revision>q.customer_seen_revision
     ORDER BY q.sent_at DESC NULLS LAST LIMIT 5`, [user.id],
  ) : null;
  return (
    <html lang="en">
      <body>
        <MotionEffects />
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Perty Print home"><span className="brand-mark">P<span>.</span></span><span>PERTY <em>PRINT</em></span></Link>
          <nav aria-label="Main navigation">
            <Link href="/#products">Products</Link>
            <Link href="/#shop-categories">Categories</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#gallery">Gallery</Link>
            <Link href="/#faq">FAQs</Link>
          </nav>
          <div className="header-actions">
            {user && <><QuoteNotificationRefresh /><QuoteNotifications notifications={unread?.rows ?? []} count={unread?.rows[0]?.unread_count ?? 0} /></>}
            {user ? <Link className="account-link" href="/account">My account</Link> : <Link className="account-link" href="/login">Sign in</Link>}
            <Link className="header-design-link" href="/#shop-categories">Start designing <span aria-hidden="true">↗</span></Link>
          </div>
        </header>
        {children}
        <footer className="site-footer"><div className="footer-about"><Link className="footer-brand" href="/">PERTY PRINT<span>.</span></Link><p>Your artwork, words, and ideas printed onto everyday products in Kosovo.</p></div><div className="footer-links"><strong>EXPLORE</strong><nav aria-label="Footer shop navigation"><Link href="/#shop-categories">Categories</Link><Link href="/#try-design">Print ideas</Link><Link href="/#products">Shop products</Link></nav></div><div className="footer-links"><strong>HELPFUL LINKS</strong><nav aria-label="Footer information navigation"><Link href="/#how-it-works">How it works</Link><Link href="/#faq">Questions</Link><Link href="/register">Create account</Link><Link href="/login">Sign in</Link></nav></div><small>© {new Date().getFullYear()} Perty Print</small></footer>
      </body>
    </html>
  );
}
