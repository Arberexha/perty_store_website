import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth/guard";
import { SignOutButton } from "@/components/sign-out-button";
import { getPool } from "@/lib/db";
import { dateTime, euro } from "@/lib/admin/format";
import { deleteDesign, duplicateDesign, shareDesign, stopSharingDesign } from "./actions";
import { ShareLink } from "./share-link";

type SavedRow = { id: string; name: string; product_id: string | null; product_name: string; product_slug: string; updated_at: Date; product_status: string | null; share_token: string | null };

export default async function AccountPage() {
  const user = await requireUser();
  const [orders, designs] = await Promise.all([
    getPool().query<{ id: string; status: string; total_cents: number; fulfillment_method: string; created_at: Date; product_names: string }>(`SELECT o.id,o.status,o.total_cents,o.fulfillment_method,o.created_at,string_agg(i.product_name, ', ' ORDER BY i.product_name) AS product_names FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`, [user.id]),
    getPool().query<SavedRow>(`SELECT d.id,d.name,d.product_id,d.product_name,d.product_slug,d.updated_at,d.share_token,p.status AS product_status
      FROM saved_designs d LEFT JOIN products p ON p.id=d.product_id WHERE d.user_id=$1 ORDER BY d.updated_at DESC LIMIT 100`, [user.id]),
  ]);
  return <main className="inner-page"><span className="eyebrow">YOUR SPACE</span><h1>Hello, {user.name}.</h1><p>Keep your designs ready to edit, and follow orders placed while signed in.</p><div className="account-card"><div><strong>Account</strong><p>{user.email}</p></div><SignOutButton /></div>
    <section className="account-designs" aria-labelledby="account-designs-title"><div className="account-section-head"><div><span className="eyebrow">DESIGN LIBRARY</span><h2 id="account-designs-title">My designs</h2><p>Saved to your account so you can continue on another device.</p></div><Link className="button" href="/#products">Create a design</Link></div>
      {designs.rows.length ? <div className="account-design-grid">{designs.rows.map((design) => <article className="account-design" key={design.id}><div className="account-design-image"><Image src={`/api/saved-designs/${design.id}/preview`} alt={`Preview of ${design.name}`} width={1000} height={420} unoptimized /></div><div className="account-design-body"><span>{design.product_name}</span><h3>{design.name}</h3><p>Edited {dateTime(design.updated_at)}</p><div className="account-design-actions">{design.product_id && design.product_status === "published" ? <Link className="account-design-edit" href={`/design/${encodeURIComponent(design.product_slug)}?saved=${design.id}`}>Continue editing →</Link> : <span className="account-design-unavailable">Product unavailable</span>}<form action={duplicateDesign}><input type="hidden" name="id" value={design.id} /><button type="submit">Duplicate</button></form>{design.share_token ? <><ShareLink token={design.share_token} /><form action={stopSharingDesign}><input type="hidden" name="id" value={design.id} /><button type="submit">Stop sharing</button></form></> : <form action={shareDesign}><input type="hidden" name="id" value={design.id} /><button type="submit">Create share link</button></form>}<form action={deleteDesign}><input type="hidden" name="id" value={design.id} /><button type="submit" className="account-design-delete">Delete</button></form></div></div></article>)}</div> : <div className="account-design-empty"><strong>No saved designs yet</strong><p>Choose a product, add your artwork, then select “Save design” in the editor.</p><Link href="/#products">Explore products →</Link></div>}</section>
    <section className="account-orders"><h2>Your orders</h2>{orders.rows.length ? <ul>{orders.rows.map((order) => <li key={order.id}><strong>#{order.id.slice(0, 8)} · {order.product_names}</strong><span>{dateTime(order.created_at)} · {order.status.replaceAll("_", " ")} · {order.fulfillment_method} · {euro(order.total_cents)}</span></li>)}</ul> : <p>No orders yet.</p>}</section>{user.role === "admin" && <Link className="button button-primary" href="/admin">Open admin dashboard</Link>}</main>;
}
