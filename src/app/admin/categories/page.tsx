import Link from "next/link";
import { AdminNotice } from "@/components/admin-notice";
import { categories } from "@/lib/admin/data";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [items, notice] = await Promise.all([categories(), searchParams]);
  const productCount = items.reduce((sum, item) => sum + item.product_count, 0);
  const publishedCount = items.reduce((sum, item) => sum + item.published_count, 0);
  const restrictedCount = items.filter((item) => item.age_restricted).length;

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">CATALOGUE STRUCTURE</span><h1>Categories</h1><p>Organize the storefront and set category-level ordering rules.</p></div><Link className="admin-primary" href="/admin/categories/new">Create category <span aria-hidden="true">↗</span></Link></div>
    <AdminNotice {...notice} />
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Categories</span></div><div><strong>{productCount}</strong><span>Products assigned</span></div><div><strong>{publishedCount}</strong><span>Published products</span></div><div><strong>{restrictedCount}</strong><span>Restricted categories</span></div></div>
    <section className="admin-panel"><div className="panel-title"><div><h2>Category directory</h2><p>Product counts reflect the current catalogue.</p></div><span>{items.length} TOTAL</span></div>
      {items.length ? <div className="admin-category-grid">{items.map((item) => <article className="admin-category-card" key={item.id}>
        <div className="admin-category-card-top"><span className="admin-category-mark">{item.name.slice(0, 1).toUpperCase()}</span><span className={item.age_restricted ? "status-pill restricted" : "status-pill positive"}>{item.age_restricted ? "18+ restricted" : "Standard"}</span></div>
        <h3>{item.name}</h3><p>/{item.slug}</p>
        <div className="admin-category-card-stats"><span><strong>{item.product_count}</strong> products</span><span><strong>{item.published_count}</strong> published</span><span><strong>{item.orderable_count}</strong> orderable</span></div>
        <Link href={`/admin/products?category=${encodeURIComponent(item.id)}`}>View products <span aria-hidden="true">↗</span></Link>
      </article>)}</div> : <div className="admin-empty">No categories yet. Create one before adding products.</div>}
    </section>
  </main>;
}
