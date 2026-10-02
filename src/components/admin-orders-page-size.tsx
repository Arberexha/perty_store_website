"use client";

import { useRouter } from "next/navigation";

export function AdminOrdersPageSize({ status, query, pageSize }: { status: string; query: string; pageSize: number }) {
  const router = useRouter();

  return <label className="admin-orders-page-size">Items per page:
    <select aria-label="Items per page" value={pageSize} onChange={(event) => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (query) params.set("q", query);
      if (event.target.value !== "25") params.set("size", event.target.value);
      router.push(`/admin/orders${params.size ? `?${params}` : ""}`);
    }}>
      <option value="25">25</option><option value="50">50</option><option value="100">100</option>
    </select>
  </label>;
}
