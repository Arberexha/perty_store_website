"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "◫", "Dashboard"],
  ["/admin/products", "▦", "Products"],
  ["/admin/categories", "◇", "Categories"],
  ["/admin/orders", "▤", "Orders"],
  ["/admin/design-requests", "✎", "Design requests"],
  ["/admin/quotes", "◉", "Quotes"],
  ["/admin/files", "▧", "Artwork files"],
  ["/admin/customers", "♧", "Customers"],
  ["/admin/settings", "⚙", "Settings"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return <nav className="admin-nav" aria-label="Admin navigation">{links.map(([href, icon, label]) => <Link key={href} className={path === href || (href !== "/admin" && path.startsWith(href + "/")) ? "active" : ""} href={href}><span className="nav-icon" aria-hidden="true">{icon}</span>{label}</Link>)}</nav>;
}
