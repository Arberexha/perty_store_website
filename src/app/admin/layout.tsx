import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { AdminOrderSoundProvider } from "@/components/admin-order-sound";
import "./admin.css";
import "./admin-theme.css";
import "./admin-workflows.css";
import "./admin-polish.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminOrderSoundProvider><div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-logo" href="/admin" aria-label="Perty Print admin dashboard"><span>P.</span><strong>perty<span>print</span></strong><small>ADMIN</small></Link>
      <AdminNav />
      <div className="sidebar-bottom">
        <Link href="/" className="storefront-link"><span>↗</span> View storefront</Link>
        <div className="sidebar-user"><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>Administrator</small></div></div>
      </div>
    </aside>
    <div className="admin-main">
      <div className="admin-topbar">
        <div className="admin-topbar-title"><span className="live-dot" /><span>Administration</span></div>
        <form className="admin-global-search" action="/admin/orders" role="search">
          <label className="visually-hidden" htmlFor="admin-search-orders">Search orders</label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
          <input id="admin-search-orders" type="search" name="q" placeholder="Search orders by number or customer..." />
          <kbd>↵</kbd>
        </form>
        <div className="admin-topbar-actions"><Link href="/admin/orders" className="admin-topbar-orders" aria-label="View orders"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg></Link><Link href="/" className="admin-topbar-storefront">View store ↗</Link><SignOutButton /></div>
      </div>
      {children}
    </div>
  </div></AdminOrderSoundProvider>;
}
