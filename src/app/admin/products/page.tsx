import Image from "next/image";
import Link from "next/link";
import { DeleteProductForm } from "./delete-product-form";
import { AdminNotice } from "@/components/admin-notice";
import { AdminIcon } from "@/components/admin-icon";
import { categories, products } from "@/lib/admin/data";
import { templateVisuals } from "@/lib/catalog-config";
import { productImageUrl } from "@/lib/product-mockup";

type Params = { q?: string; status?: string; category?: string; saved?: string; deleted?: string; error?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [items, groups, params] = await Promise.all([products(), categories(), searchParams]);
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = ["all", "published", "draft", "archived"].includes(params.status ?? "") ? params.status : "all";
  const category = groups.some((group) => group.id === params.category) ? params.category : "all";
  const filtered = items.filter((item) =>
    (!query || `${item.name} ${item.slug} ${item.category_name}`.toLowerCase().includes(query)) &&
    (status === "all" || item.status === status) &&
    (category === "all" || item.category_id === category),
  );
  const published = items.filter((item) => item.status === "published").length;
  const draft = items.filter((item) => item.status === "draft").length;
  const orderable = items.filter((item) => item.ordering_enabled).length;
  const needsPricing = items.filter((item) => item.status !== "archived" && !item.age_restricted && item.priced_variant_count === 0).length;

  return <main className="admin-content">
    <div className="admin-page-heading"><div><span className="admin-kicker">CATALOGUE MANAGEMENT</span><h1>Products</h1><p>Manage listings, design previews, pricing, and ordering readiness.</p></div><Link className="admin-primary" href="/admin/products/new">Add product <span aria-hidden="true">↗</span></Link></div>
    <AdminNotice {...params} />
    <div className="admin-summary-strip"><div><strong>{items.length}</strong><span>Total products</span></div><div><strong>{published}</strong><span>Published</span></div><div><strong>{draft}</strong><span>Drafts</span></div><div><strong>{orderable}</strong><span>Online ordering</span></div><div><strong>{needsPricing}</strong><span>Need a price</span></div></div>
    <section className="admin-panel table-panel">
      <div className="panel-title"><div><h2>Product catalogue</h2><p>Use filters to find and update a listing.</p></div><span>{filtered.length} SHOWN</span></div>
      <form method="get" action="/admin/products" className="admin-filter-bar" role="search">
        <label>Search products<input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Name, URL, or category" /></label>
        <label>Status<select name="status" defaultValue={status}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
        <label>Category<select name="category" defaultValue={category}><option value="all">All categories</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <button className="admin-secondary" type="submit">Apply filters</button>
        {(query || status !== "all" || category !== "all") && <Link className="admin-clear-filter" href="/admin/products">Clear</Link>}
      </form>
      {filtered.length ? <div className="admin-table-wrap"><table className="admin-table admin-product-table"><thead><tr><th>Product</th><th>Category / studio</th><th>Variants</th><th>Listing</th><th>Readiness</th><th>Actions</th></tr></thead><tbody>
        {filtered.map((item) => {
          const image = item.has_mockup ? productImageUrl(item.id, item.updated_at) : item.design_template ? templateVisuals[item.design_template].image : null;
          const readiness = item.age_restricted ? "18+ preview" : item.ordering_enabled ? "Ordering on" : item.priced_variant_count > 0 ? "Ready to enable" : "Needs price";
          return <tr key={item.id}>
            <td><div className="admin-product-cell"><span className="admin-product-thumb">{image ? <Image src={image} alt="" width={52} height={52} unoptimized={item.has_mockup} /> : <AdminIcon name="products" />}</span><span><Link className="admin-product-name" href={`/admin/products/${item.id}`}>{item.name}</Link><small>/{item.slug}</small></span></div></td>
            <td><strong>{item.category_name}</strong><small>{item.design_template ?? "No studio"}</small></td>
            <td><strong>{item.variant_count}</strong><small>{item.priced_variant_count} priced</small></td>
            <td><span className={`status-pill ${item.status === "published" ? "positive" : ""}`}>{item.status}</span></td>
            <td><span className={`status-pill ${item.age_restricted ? "restricted" : item.ordering_enabled ? "positive" : ""}`}>{readiness}</span></td>
            <td><div className="product-actions"><Link className="admin-secondary" href={`/admin/products/${item.id}`}>Manage</Link><DeleteProductForm id={item.id} name={item.name} /></div></td>
          </tr>;
        })}
      </tbody></table></div> : <div className="admin-empty">{items.length ? "No products match these filters." : "No products yet. Add your first product to start building the catalogue."}</div>}
    </section>
  </main>;
}
