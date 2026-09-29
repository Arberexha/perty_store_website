"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon } from "@/components/admin-icon";
import type { AdminIconName } from "@/components/admin-icon";

const groups: { label: string; links: { href: string; icon: AdminIconName; label: string }[] }[] = [
  { label: "Overview", links: [{ href: "/admin", icon: "dashboard", label: "Dashboard" }] },
  { label: "Commerce", links: [
    { href: "/admin/products", icon: "products", label: "Products" },
    { href: "/admin/categories", icon: "categories", label: "Categories" },
    { href: "/admin/orders", icon: "orders", label: "Orders" },
    { href: "/admin/design-requests", icon: "designs", label: "Design requests" },
    { href: "/admin/quotes", icon: "quotes", label: "Quotes" },
  ] },
  { label: "Workspace", links: [
    { href: "/admin/files", icon: "files", label: "Artwork files" },
    { href: "/admin/customers", icon: "customers", label: "Customers" },
    { href: "/admin/settings", icon: "settings", label: "Settings" },
  ] },
];

export function AdminNav() {
  const path = usePathname();
  return <nav className="admin-nav" aria-label="Admin navigation">{groups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.links.map((link) => {
    const active = path === link.href || (link.href !== "/admin" && path.startsWith(link.href + "/"));
    return <Link key={link.href} className={active ? "active" : ""} href={link.href} aria-current={active ? "page" : undefined}><span className="nav-icon"><AdminIcon name={link.icon} /></span><span>{link.label}</span></Link>;
  })}</div>)}</nav>;
}
