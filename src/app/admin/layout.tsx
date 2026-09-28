import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import "./admin.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-logo" href="/admin"><span>P.</span><strong>perty<span>print</span></strong><small>ADMIN</small></Link><div className="sidebar-label">WORKSPACE</div><AdminNav /><div className="sidebar-bottom"><Link href="/">↗ <span>View storefront</span></Link><div className="sidebar-user"><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>Administrator</small></div></div></div></aside><div className="admin-main"><div className="admin-topbar"><span>Shop workspace <b>/</b> Kosovo</span><div><span className="live-dot" /> Development store <SignOutButton /></div></div>{children}</div></div>;
}
