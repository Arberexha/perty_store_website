"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ORDER_ANNOUNCEMENT_EVENT, ORDER_ANNOUNCEMENT_KEY } from "@/lib/order-announcement";
import type { OrderAnnouncement } from "@/lib/order-announcement";

function dateParts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day, date: new Date(Date.UTC(year, month - 1, day)) };
}

function dateRange(minDate: string, maxDate: string) {
  const first = dateParts(minDate);
  const last = dateParts(maxDate);
  const full = (date: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  if (minDate === maxDate) return full(first.date);
  if (first.year === last.year && first.month === last.month) return `${first.day}–${full(last.date)}`;
  return `${full(first.date)}–${full(last.date)}`;
}

function validAnnouncement(value: unknown): value is OrderAnnouncement {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OrderAnnouncement>;
  return typeof item.id === "string" && /^[0-9a-f-]{36}$/i.test(item.id)
    && (item.trackingPath === null || typeof item.trackingPath === "string" && item.trackingPath.startsWith("/track/"))
    && (item.readyEstimate === null || Boolean(item.readyEstimate && /^\d{4}-\d{2}-\d{2}$/.test(item.readyEstimate.minDate) && /^\d{4}-\d{2}-\d{2}$/.test(item.readyEstimate.maxDate) && ["pickup", "delivery", "production"].includes(item.readyEstimate.kind)));
}

export function OrderAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<OrderAnnouncement | null>(null);

  useEffect(() => {
    const restore = () => {
      try {
        const stored = window.sessionStorage.getItem(ORDER_ANNOUNCEMENT_KEY);
        if (!stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (validAnnouncement(parsed)) setAnnouncement(parsed);
      } catch { /* Storage may be unavailable. The current order event still works. */ }
    };
    const onPlaced = (event: Event) => {
      const item = (event as CustomEvent<unknown>).detail;
      if (validAnnouncement(item)) setAnnouncement(item);
    };
    const timer = window.setTimeout(restore, 0);
    window.addEventListener(ORDER_ANNOUNCEMENT_EVENT, onPlaced);
    return () => { window.clearTimeout(timer); window.removeEventListener(ORDER_ANNOUNCEMENT_EVENT, onPlaced); };
  }, []);

  if (!announcement) return null;
  const estimate = announcement.readyEstimate;
  const label = estimate?.kind === "pickup" ? "ready for pickup" : estimate?.kind === "delivery" ? "arrive" : "finish production";
  return <div className="order-announcement" role="status"><div className="order-announcement-inner"><span className="order-announcement-icon" aria-hidden="true">✓</span><p><strong>Order #{announcement.id.slice(0, 8)} placed.</strong> {estimate ? <>Estimated to {label} {dateRange(estimate.minDate, estimate.maxDate)}. <span>The shop will confirm the date after reviewing your order.</span></> : "The shop will confirm your timing shortly."}</p>{announcement.trackingPath && <Link href={announcement.trackingPath}>Track order ↗</Link>}<button type="button" aria-label="Dismiss order update" onClick={() => { setAnnouncement(null); try { window.sessionStorage.removeItem(ORDER_ANNOUNCEMENT_KEY); } catch { /* Storage may be unavailable. */ } }}>×</button></div></div>;
}
