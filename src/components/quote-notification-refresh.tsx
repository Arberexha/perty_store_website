"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function QuoteNotificationRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/account/quotes/")) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router, pathname]);

  return null;
}
