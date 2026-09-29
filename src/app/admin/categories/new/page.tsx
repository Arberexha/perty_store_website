import Link from "next/link";
import { createCategory } from "../../actions";
import { AdminNotice } from "@/components/admin-notice";

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const notice = await searchParams;
  return <main className="admin-content admin-editor-page">
    <Link className="admin-back" href="/admin/categories">← Back to categories</Link>
    <div className="admin-page-heading"><div><span className="admin-kicker">NEW CATEGORY</span><h1>Create a category</h1><p>Define a product group before assigning products to it.</p></div></div>
    <AdminNotice {...notice} />
    <div className="admin-editor-grid">
      <form action={createCategory} className="admin-panel admin-form admin-editor-form">
        <div className="admin-form-section"><span className="admin-step-number">01</span><div><h2>Category identity</h2><p>Use a short name customers will understand in navigation and product lists.</p></div></div>
        <label>Category name<input name="name" maxLength={80} required autoFocus placeholder="For example, Accessories" /><small className="form-help">A URL slug is generated automatically from the name.</small></label>
        <div className="admin-form-section admin-form-section-separated"><span className="admin-step-number">02</span><div><h2>Ordering policy</h2><p>Restricted categories are visible for preview but cannot accept online orders.</p></div></div>
        <label className="admin-choice"><input type="checkbox" name="age_restricted" /><span><strong>Age restricted (18+)</strong><small>Use this for lighters and any other adult-only category.</small></span></label>
        <div className="admin-form-actions"><Link className="admin-secondary" href="/admin/categories">Cancel</Link><button className="admin-primary" type="submit">Create category</button></div>
      </form>
      <aside className="admin-panel admin-editor-help"><span className="admin-kicker">HOW IT WORKS</span><h2>After creating a category</h2><ol><li>Add a product and assign it to this category.</li><li>Choose a design studio and upload a product photo if needed.</li><li>Publish the product when its listing is ready.</li></ol><p>Category names must be unique. Restricted products stay preview only.</p><Link href="/admin/products">View product catalogue ↗</Link></aside>
    </div>
  </main>;
}
