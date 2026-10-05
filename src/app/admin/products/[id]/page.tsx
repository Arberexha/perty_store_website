import Link from "next/link";
import { notFound } from "next/navigation";
import { createTier, createVariant, deleteTier, updateProduct, updateVariant } from "../../actions";
import { AdminNotice } from "@/components/admin-notice";
import { categories, product, tiers, variants } from "@/lib/admin/data";
import { euro } from "@/lib/admin/format";
import { productImageUrl } from "@/lib/product-mockup";
import { MockupFields } from "../mockup-fields";

export default async function ProductDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [item, groups, options, priceTiers, notice] = await Promise.all([product(id), categories(), variants(id), tiers(id), searchParams]);
  if (!item) notFound();
  const checklist = [
    { label: "Product details", complete: Boolean(item.name && item.category_id && item.design_template) },
    { label: "Product photo", complete: item.has_mockup },
    { label: "Active priced variant", complete: item.priced_variant_count > 0 },
    { label: "Published", complete: item.status === "published" },
    { label: "Online ordering", complete: item.ordering_enabled },
  ];

  return <main className="admin-content admin-product-editor">
    <Link className="admin-back" href="/admin/products">← Back to products</Link>
    <div className="admin-page-heading"><div><span className="admin-kicker">PRODUCT WORKSPACE</span><h1>{item.name}</h1><p>Manage its listing, design preview, variants, and purchase settings.</p></div><span className={item.age_restricted ? "status-pill restricted" : item.status === "published" ? "status-pill positive" : "status-pill"}>{item.age_restricted ? "18+ preview" : item.status}</span></div>
    <AdminNotice {...notice} />
    <section className="admin-panel admin-product-readiness"><div className="panel-title"><div><h2>Setup progress</h2><p>Complete the steps that apply to this product.</p></div><span>{checklist.filter((step) => step.complete).length} / {checklist.length} COMPLETE</span></div><div className="admin-readiness-list">{checklist.map((step) => <span className={step.complete ? "is-complete" : ""} key={step.label}><b>{step.complete ? "✓" : "○"}</b>{step.label}</span>)}</div><p className="form-help">Photos are optional when the standard studio image is suitable. Lighters stay preview only.</p></section>

    <div className="admin-two-column wide-first">
      <section className="admin-panel"><div className="panel-title"><div><h2>Product listing</h2><p>Information customers see on the storefront.</p></div></div>
        <form action={updateProduct} className="admin-form"><input type="hidden" name="id" value={item.id} />
          <div className="form-row"><label>Name<input name="name" defaultValue={item.name} maxLength={120} required /></label><label>Category<select name="category_id" defaultValue={item.category_id}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.age_restricted ? " (18+)" : ""}</option>)}</select></label></div>
          <label>Design studio<select name="design_template" defaultValue={item.design_template ?? ""} required><option value="" disabled>Choose a product type</option><option value="pens">Pen</option><option value="shirts">T-shirt</option><option value="hats">Hat</option><option value="lighters">Lighter (18+ preview only)</option></select></label>
          <label>Description<textarea name="description" rows={4} defaultValue={item.description} /></label>
          <div className="admin-form-section admin-form-section-separated"><span className="admin-step-number">01</span><div><h2>Photo and print area</h2><p>Use a clear product photo and place the printable region accurately.</p></div></div>
          <MockupFields imageUrl={item.has_mockup ? productImageUrl(item.id, item.updated_at) : null} initialArea={item.print_area} />
          <div className="admin-form-section admin-form-section-separated"><span className="admin-step-number">02</span><div><h2>Publishing and ordering</h2><p>Publish the listing when it is ready, then enable ordering after adding a price.</p></div></div>
          <div className="form-row"><label>Status<select name="status" defaultValue={item.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label>Minimum quantity<input name="minimum_quantity" type="number" min="1" defaultValue={item.minimum_quantity} required /></label></div>
          <div className="admin-form-section admin-form-section-separated"><span className="admin-step-number">03</span><div><h2>Ready-date estimate</h2><p>Set a production range in business days. Leave both blank until you can give customers a reliable estimate.</p></div></div>
          <div className="form-row"><label>Production from (business days)<input name="production_min_days" type="number" min="1" max="60" defaultValue={item.production_min_days ?? ""} /></label><label>Production to (business days)<input name="production_max_days" type="number" min="1" max="60" defaultValue={item.production_max_days ?? ""} /></label></div>
          <div className="form-row"><label>Large order starts at (items)<input name="bulk_threshold" type="number" min="2" max="1000" defaultValue={item.bulk_threshold ?? ""} /></label><label>Extra business days<input name="bulk_extra_days" type="number" min="1" max="60" defaultValue={item.bulk_extra_days ?? ""} /></label></div>
          <p className="form-help">When the quantity reaches the large-order threshold, the extra days are added once to both ends of the range.</p>
          <label className="checkbox-label"><input name="age_restricted" type="checkbox" defaultChecked={item.age_restricted} /> Age restricted (18+)</label>
          <label className="checkbox-label"><input name="ordering_enabled" type="checkbox" defaultChecked={item.ordering_enabled} disabled={item.age_restricted} /> Allow customer ordering</label>
          <p className="form-help">Online ordering requires a published, unrestricted product with an active priced variant.</p>
          <button className="admin-primary" type="submit">Save product changes</button>
        </form>
      </section>
      <aside className="admin-panel summary-panel"><div className="panel-title"><h2>At a glance</h2></div><dl><div><dt>Category</dt><dd>{item.category_name}</dd></div><div><dt>Design studio</dt><dd>{item.design_template ?? "Not selected"}</dd></div><div><dt>Variants</dt><dd>{item.variant_count}</dd></div><div><dt>Priced variants</dt><dd>{item.priced_variant_count}</dd></div><div><dt>Minimum quantity</dt><dd>{item.minimum_quantity}</dd></div><div><dt>Customer ordering</dt><dd>{item.ordering_enabled ? "Enabled" : "Disabled"}</dd></div></dl><Link className="admin-secondary" href="#variants">Go to variants ↓</Link></aside>
    </div>

    <section className="admin-panel variants-panel" id="variants"><div className="panel-title"><div><h2>Variants and pricing</h2><p>Set sizes, materials, colors, and unit prices.</p></div><span>{options.length} VARIANTS</span></div>
      {options.length ? <div className="variant-list">{options.map((option) => <div className="variant-card" key={option.id}>
        <div className="variant-heading"><div><strong>{option.label}</strong><small>SKU {option.sku} · {option.size || "Any size"} · {option.material || "Any material"} · {option.color || "Any color"}</small></div><span className={option.active ? "status-pill positive" : "status-pill"}>{option.active ? "Active" : "Inactive"}</span></div>
        <form action={updateVariant} className="admin-form compact-form"><input type="hidden" name="id" value={option.id} /><input type="hidden" name="product_id" value={item.id} /><div className="form-row four"><label>Label<input name="label" defaultValue={option.label} required /></label><label>Size<input name="size" defaultValue={option.size} /></label><label>Material<input name="material" defaultValue={option.material} /></label><label>Color<input name="color" defaultValue={option.color} /></label></div><div className="form-row"><label>Base unit price (€)<input name="base_price" inputMode="decimal" defaultValue={option.base_price_cents == null ? "" : (option.base_price_cents / 100).toFixed(2)} placeholder="Not set" /></label><label className="checkbox-label"><input name="active" type="checkbox" defaultChecked={option.active} /> Active</label></div><button className="admin-secondary" type="submit">Save variant</button></form>
        <div className="tier-list"><strong>Quantity prices</strong>{priceTiers.filter((tier) => tier.variant_id === option.id).map((tier) => <div key={tier.id}><span>{tier.minimum_quantity}+ units: {euro(tier.unit_price_cents)} each</span><form action={deleteTier}><input type="hidden" name="id" value={tier.id} /><input type="hidden" name="product_id" value={item.id} /><button className="table-link" type="submit">Remove</button></form></div>)}</div>
        <form action={createTier} className="admin-form compact-form tier-form"><input type="hidden" name="product_id" value={item.id} /><input type="hidden" name="variant_id" value={option.id} /><label>From quantity<input type="number" name="minimum_quantity" min="2" required placeholder="10" /></label><label>Unit price (€)<input name="unit_price" inputMode="decimal" required placeholder="8.50" /></label><button className="admin-secondary" type="submit">Add price tier</button></form>
      </div>)}</div> : <div className="admin-empty">No variants yet. Add one below to set a price and prepare ordering.</div>}
    </section>
    <section className="admin-panel"><div className="panel-title"><div><h2>Add a variant</h2><p>Each variant can have its own size, material, color, and price.</p></div></div><form action={createVariant} className="admin-form"><input type="hidden" name="product_id" value={item.id} /><div className="form-row"><label>SKU<input name="sku" maxLength={80} required placeholder="TSHIRT-M-COTTON" /></label><label>Label<input name="label" maxLength={120} required placeholder="Medium · Cotton" /></label></div><div className="form-row four"><label>Size<input name="size" placeholder="M" /></label><label>Material<input name="material" placeholder="Cotton" /></label><label>Color<input name="color" placeholder="White" /></label><label>Base unit price (€)<input name="base_price" inputMode="decimal" placeholder="Leave blank until approved" /></label></div><button className="admin-primary" type="submit">Add variant</button></form></section>
  </main>;
}
