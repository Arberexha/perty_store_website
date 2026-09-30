import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { AdminOrderSound } from "@/components/admin-order-sound";
import "./admin.css";
import "./admin-theme.css";
import "./admin-workflows.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-logo" href="/admin" aria-label="Perty Print admin dashboard"><span>P.</span><strong>perty<span>print</span></strong><small>ADMIN</small></Link>
      <AdminNav />
      <div className="sidebar-bottom">
        <Link href="/" className="storefront-link"><span>↗</span> View storefront</Link>
        <div className="sidebar-user"><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>Administrator</small></div></div>
      </div>
    </aside>
    <div className="admin-main">
      <div className="admin-topbar"><div className="admin-topbar-title"><span className="live-dot" /><span>Perty Print</span><b>/</b><strong>Administration</strong></div><div className="admin-topbar-actions"><AdminOrderSound /><Link href="/" className="admin-topbar-storefront">View store ↗</Link><SignOutButton /></div></div>
      {children}
    </div>
  </div>;
}
