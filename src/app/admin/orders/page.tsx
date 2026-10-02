import Link from "next/link";
import { AdminNotice } from "@/components/admin-notice";
import { AdminOrdersPageSize } from "@/components/admin-orders-page-size";
import { orderList } from "@/lib/admin/data";
import { dateTime, euro } from "@/lib/admin/format";
import { openOrder } from "./actions";

const statuses = ["all", "new", "in_production", "ready", "shipped", "completed", "cancelled"] as const;
const pageSizes = [25, 50, 100] as const;

type OrderSearchParams = { saved?: string; error?: string; status?: string; q?: string; page?: string; size?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderSearchParams> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status! : "all";
  const query = (params.q ?? "").trim().slice(0, 120);
  const requestedSize = Number(params.size);
  const pageSize = pageSizes.includes(requestedSize as typeof pageSizes[number]) ? requestedSize : 25;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const list = await orderList({ status, search: query.toLocaleLowerCase(), page, pageSize });
  const first = list.total ? (list.page - 1) * pageSize + 1 : 0;
  const last = Math.min(list.page * pageSize, list.total);

  function listHref(nextStatus = status, nextPage = 1) {
    const search = new URLSearchParams();
    if (nextStatus !== "all") search.set("status", nextStatus);
    if (query) search.set("q", query);
    if (nextPage > 1) search.set("page", String(nextPage));
    if (pageSize !== 25) search.set("size", String(pageSize));
    return `/admin/orders${search.size ? `?${search}` : ""}`;
  }

  return <main className="admin-orders-page">
    <div className="admin-orders-heading">
      <div><span className="admin-kicker">ORDER MANAGEMENT</span><h1>Orders <span>({list.allTotal})</span></h1><p>Review purchases, payments, and delivery details.</p></div>
      <Link className="admin-secondary" href="/admin/design-requests">Design requests ↗</Link>
    </div>
    <div className="admin-orders-notice"><AdminNotice {...params} /></div>
    <section className="admin-orders-workspace" aria-label="Orders list">
      <div className="admin-orders-toolbar">
        <div className="admin-orders-toolbar-title"><strong>Orders <span>({list.total})</span></strong>{query && <span className="admin-orders-query">Search: “{query}” <Link href="/admin/orders">Clear</Link></span>}</div>
        <span className="admin-orders-toolbar-hint">Newest first</span>
      </div>
      <nav className="admin-orders-tabs" aria-label="Filter orders by status">{statuses.map((option) => <Link key={option} href={listHref(option)} className={status === option ? "is-active" : ""} aria-current={status === option ? "page" : undefined}>{option === "all" ? "All orders" : option.replaceAll("_", " ")}</Link>)}</nav>
      {list.items.length ? <div className="admin-orders-table-scroll"><table className="admin-table orders-table admin-orders-table">
        <thead><tr><th>Order number</th><th>Sales channel</th><th>Customer name</th><th>Delivery / pickup</th><th>Items</th><th>Order value</th><th>Order status</th><th>Payment status</th><th>Order date</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
        <tbody>{list.items.map((item) => <tr key={item.id} className={item.admin_viewed_at ? undefined : "is-unread"}>
          <td><div className="admin-order-number"><form action={openOrder} className="order-open-form"><input type="hidden" name="id" value={item.id} /><button className="table-link mono" type="submit">#{item.id.slice(0, 8)}</button></form>{!item.admin_viewed_at && <span className="order-unread">Unread</span>}</div></td>
          <td>Online store</td>
          <td><strong>{item.customer_name}</strong><small>{item.customer_email}</small></td>
          <td className="admin-orders-address">{item.fulfillment_method === "delivery" ? <><strong>Delivery</strong><small>{item.shipping_address || "Address pending"}</small></> : <strong>Pickup</strong>}</td>
          <td>{item.item_count}</td>
          <td className="admin-orders-value">{euro(item.total_cents)}</td>
          <td><span className={item.status === "completed" ? "status-pill positive" : item.status === "cancelled" ? "status-pill restricted" : "status-pill"}>{item.status.replaceAll("_", " ")}</span></td>
          <td><span className={item.payment_status === "paid" ? "status-pill positive" : "status-pill"}>{item.payment_status ?? "unpaid"}</span></td>
          <td className="admin-order-date">{dateTime(item.created_at)}</td>
          <td><form action={openOrder} className="order-open-form"><input type="hidden" name="id" value={item.id} /><button className="admin-orders-row-action" type="submit" title="Manage order"><span aria-hidden="true">•••</span><span className="visually-hidden">Manage</span></button></form></td>
        </tr>)}</tbody>
      </table></div> : <div className="admin-empty">{list.allTotal ? query ? "No orders match your search." : "No orders match this status." : "No orders yet. They will appear when customers place orders."}</div>}
      <div className="admin-orders-footer">
        <span className="admin-orders-range">Showing {first}–{last} of {list.total}</span>
        <nav className="admin-orders-pages" aria-label="Order pages">
          {list.page > 1 ? <Link href={listHref(status, list.page - 1)} aria-label="Previous page">‹</Link> : <span aria-hidden="true">‹</span>}
          {Array.from({ length: list.pageCount }, (_, index) => index + 1).map((number) => <Link key={number} href={listHref(status, number)} className={list.page === number ? "is-active" : ""} aria-current={list.page === number ? "page" : undefined}>{number}</Link>)}
          {list.page < list.pageCount ? <Link href={listHref(status, list.page + 1)} aria-label="Next page">›</Link> : <span aria-hidden="true">›</span>}
        </nav>
        <AdminOrdersPageSize status={status} query={query} pageSize={pageSize} />
      </div>
    </section>
  </main>;
}
