import Link from "next/link";
import { createProduct } from "../actions";
import { DeleteProductForm } from "./delete-product-form";
import { AdminNotice } from "@/components/admin-notice";
import { categories, products } from "@/lib/admin/data";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string }> }) {
  const [items, groups, notice] = await Promise.all([products(), categories(), searchParams]);

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><span className="admin-kicker">CATALOGUE</span><h1>Products</h1><p>Manage every product&apos;s options, price, and availability.</p></div>
      </div>
      <AdminNotice {...notice} />
      <div className="admin-two-column wide-first">
        <section className="admin-panel table-panel">
          <div className="panel-title"><h2>Product catalogue</h2><span>{items.length} products</span></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Category</th><th>Variants</th><th>Status</th><th>Online orders</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong><small>/{item.slug}</small></td>
                    <td>{item.category_name}</td>
                    <td>{item.variant_count}</td>
                    <td><span className="status-pill">{item.status}</span></td>
                    <td>{item.age_restricted ? <span className="status-pill restricted">18+ excluded</span> : item.ordering_enabled ? <span className="status-pill positive">Enabled</span> : "Off"}</td>
                    <td><div className="product-actions"><Link className="table-link" href={`/admin/products/${item.id}`}>Edit ↗</Link><DeleteProductForm id={item.id} name={item.name} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <div className="admin-empty">No products yet. Add your first product with the form.</div>}
          </div>
        </section>
        <section className="admin-panel">
          <div className="panel-title"><h2>Add product</h2></div>
          <form action={createProduct} className="admin-form">
            <label>Product name<input name="name" maxLength={120} required placeholder="Custom T-shirt" /></label>
            <label>Category<select name="category_id" required defaultValue=""><option value="" disabled>Choose a category</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}{group.age_restricted ? " (18+)" : ""}</option>)}</select></label>
            <label>Minimum quantity<input name="minimum_quantity" type="number" min="1" defaultValue="1" required /></label>
            <label>Description<textarea name="description" rows={4} placeholder="What can customers customize?" /></label>
            <p className="form-help">New products start as drafts. Add priced variants before enabling online orders.</p>
            <button className="admin-primary" type="submit">Add product</button>
          </form>
        </section>
      </div>
    </main>
  );
}
