import Link from "next/link";
import { createProduct } from "../../actions";
import { MockupFields } from "../mockup-fields";
import { AdminNotice } from "@/components/admin-notice";
import { categories } from "@/lib/admin/data";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [groups, notice] = await Promise.all([categories(), searchParams]);
  return <main className="admin-content admin-editor-page">
    <Link className="admin-back" href="/admin/products">← Back to products</Link>
    <div className="admin-page-heading"><div><span className="admin-kicker">NEW PRODUCT</span><h1>Add a product</h1><p>Create a draft listing. Configure prices and publish it after the basic setup.</p></div></div>
    <AdminNotice {...notice} />
    <div className="admin-editor-grid">
      <form action={createProduct} className="admin-panel admin-form admin-editor-form">
        <div className="admin-form-section"><span className="admin-step-number">01</span><div><h2>Product details</h2><p>Give the product a clear name and place it in the right category.</p></div></div>
        <div className="form-row"><label>Product name<input name="name" maxLength={120} required autoFocus placeholder="For example, Custom T-shirt" /><small className="form-help">The product URL is created from this name.</small></label><label>Category<select name="category_id" required defaultValue=""><option value="" disabled>Choose a category</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.age_restricted ? " (18+)" : ""}</option>)}</select><small className="form-help"><Link href="/admin/categories/new">Need a category? Create one ↗</Link></small></label></div>
        <label>Description<textarea name="description" rows={4} maxLength={5000} placeholder="Describe the product, its material, and what can be printed." /><small className="form-help">This appears on the product page and helps customers understand the item.</small></label>

        <div className="admin-form-section admin-form-section-separated"><span className="admin-step-number">02</span><div><h2>Design experience</h2><p>Choose the preview studio customers will use and set the smallest order size.</p></div></div>
        <div className="form-row"><label>Design studio<select name="design_template" required defaultValue=""><option value="" disabled>Choose a product type</option><option value="pens">Pen</option><option value="shirts">T-shirt</option><option value="hats">Hat</option><option value="lighters">Lighter (18+ preview only)</option></select></label><label>Minimum quantity<input name="minimum_quantity" type="number" min="1" defaultValue="1" required /><small className="form-help">Customers cannot request fewer than this amount.</small></label></div>

        <div className="admin-form-section admin-form-section-separated"><span className="admin-step-number">03</span><div><h2>Product image and print area</h2><p>Upload your own mockup or use the standard studio image for now.</p></div></div>
        <MockupFields />
        <div className="admin-form-actions"><Link className="admin-secondary" href="/admin/products">Cancel</Link><button className="admin-primary" type="submit" disabled={!groups.length}>Create draft product</button></div>
      </form>
      <aside className="admin-panel admin-editor-help"><span className="admin-kicker">PUBLISHING CHECKLIST</span><h2>What happens next?</h2><ol><li>Create the draft with its product details and preview image.</li><li>Add at least one variant with a price if customers should order online.</li><li>Review the listing, then publish and enable ordering from the product page.</li></ol><p>18+ products can be previewed but cannot be ordered online.</p>{!groups.length && <Link href="/admin/categories/new">Create a category first ↗</Link>}</aside>
    </div>
  </main>;
}
