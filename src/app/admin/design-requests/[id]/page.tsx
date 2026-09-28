import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDesignRequest } from "../../actions";
import { AdminNotice } from "@/components/admin-notice";
import { designRequest } from "@/lib/admin/data";
import { dateTime } from "@/lib/admin/format";

const productNames = { pens: "Pens", shirts: "T-shirts", hats: "Hats" };
const statuses = ["new", "reviewing", "quoted", "closed", "cancelled"];

export default async function DesignRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [item, notice] = await Promise.all([designRequest(id), searchParams]);
  if (!item) notFound();
  const layers = Array.isArray(item.design_data?.layers) ? item.design_data.layers : [];
  const personalizations = Array.isArray(item.design_data?.personalizations) ? item.design_data.personalizations : [];
  const requestedColors = Array.isArray(item.design_data?.productColors) ? item.design_data.productColors : [item.product_color];
  return <main className="admin-content">
    <Link href="/admin/design-requests" className="admin-back">← All design requests</Link>
    <div className="admin-page-heading"><div><span className="admin-kicker">CUSTOMER DESIGN</span><h1>Request #{item.id.slice(0, 8)}</h1><p>Submitted {dateTime(item.created_at)} · {(item.product_name ?? productNames[item.product_type])} · {item.quantity} requested</p></div></div>
    <AdminNotice {...notice} />
    <div className="admin-two-column wide-first">
      <section className="admin-panel"><div className="panel-title"><h2>Design preview{item.product_type === "shirts" ? ` · ${item.design_data?.previewSide ?? "front"}` : ""}</h2><a className="table-link" href={`/admin/design-requests/${item.id}/preview`} download={`perty-design-${item.id.slice(0, 8)}.png`}>Download PNG ↓</a></div><Image unoptimized src={`/admin/design-requests/${item.id}/preview`} width={1000} height={item.design_data?.previewHeight ?? 420} alt={`${(item.product_name ?? productNames[item.product_type])} design submitted by ${item.customer_name}`} className="design-request-preview" /><p className="form-help">Visual mockup. Check the original design details before production.</p><div className="design-request-layers"><h3>Design layers</h3>{layers.length ? <ul>{layers.map((layer, index) => <li key={index}><strong>{item.product_type === "shirts" ? `${layer.side ?? "front"}: ` : ""}</strong>{layer.kind === "text" ? `Text: ${layer.text ?? ""}` : <><span>Artwork · </span><a className="table-link" href={`/admin/design-requests/${item.id}/artwork/${index}`}>Download artwork</a></>}</li>)}</ul> : <p>No layers saved.</p>}{personalizations.length > 0 && <><h3>Names & numbers</h3><ul>{personalizations.map((entry, index) => <li key={index}>{entry.name || "—"} · #{entry.number || "—"} · Size {entry.size}</li>)}</ul></>}</div></section>
      <div><section className="admin-panel summary-panel"><div className="panel-title"><h2>Customer and product</h2></div><dl><div><dt>Name</dt><dd>{item.customer_name}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${item.customer_email}`}>{item.customer_email}</a></dd></div><div><dt>Phone</dt><dd>{item.customer_phone || "—"}</dd></div><div><dt>Product</dt><dd>{(item.product_name ?? productNames[item.product_type])}</dd></div><div><dt>Quantity</dt><dd>{item.quantity}</dd></div><div><dt>Product color</dt><dd><span className="design-request-color" style={{ backgroundColor: item.product_color }} /> {item.product_color}</dd></div></dl>{item.notes && <div className="design-request-notes"><strong>Customer notes</strong><p>{item.notes}</p></div>}</section>
        <section className="admin-panel"><div className="panel-title"><h2>Requested {(item.product_name ?? productNames[item.product_type]).toLowerCase()} colors</h2></div><ul>{requestedColors.map((color, index) => <li key={`${color}-${index}`}><span className="design-request-color" style={{ backgroundColor: color }} /> {color}</li>)}</ul></section>
        <section className="admin-panel"><div className="panel-title"><h2>Manage request</h2></div><form action={updateDesignRequest} className="admin-form"><input type="hidden" name="id" value={item.id} /><label>Status<select name="status" defaultValue={item.status}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Internal note<textarea name="admin_note" rows={5} defaultValue={item.admin_note} maxLength={5000} /></label><button type="submit" className="admin-primary">Save request</button></form></section></div>
    </div>
  </main>;
}
