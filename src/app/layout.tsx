import type { Metadata } from "next";
import Link from "next/link";
import MotionEffects from "@/components/motion-effects";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perty Print — Make it yours",
  description: "Custom printed goods, designed by you in Kosovo.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
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
            {user ? <Link className="account-link" href="/account">My account</Link> : <Link className="account-link" href="/login">Sign in</Link>}
            <Link className="header-design-link" href="/#shop-categories">Start designing <span aria-hidden="true">↗</span></Link>
          </div>
        </header>
        {children}
        <footer className="site-footer"><div className="footer-about"><Link className="footer-brand" href="/">PERTY PRINT<span>.</span></Link><p>Your artwork, words, and ideas printed onto everyday products in Kosovo.</p></div><div className="footer-links"><strong>EXPLORE</strong><nav aria-label="Footer shop navigation"><Link href="/#shop-categories">Categories</Link><Link href="/#products">Print ideas</Link><Link href="/design/pens">Pen designer</Link><Link href="/design/shirts">T-shirt designer</Link><Link href="/design/hats">Hat designer</Link><Link href="/design/lighters">Lighter preview 18+</Link></nav></div><div className="footer-links"><strong>HELPFUL LINKS</strong><nav aria-label="Footer information navigation"><Link href="/#how-it-works">How it works</Link><Link href="/#faq">Questions</Link><Link href="/register">Create account</Link><Link href="/login">Sign in</Link></nav></div><small>© {new Date().getFullYear()} Perty Print</small></footer>
      </body>
    </html>
  );
}
