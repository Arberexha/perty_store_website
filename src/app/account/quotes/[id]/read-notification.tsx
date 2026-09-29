"use client";

import { useEffect, useRef } from "react";
import { markQuoteNotificationRead } from "../notification-action";

export function ReadQuoteNotification({ id, revision }: { id: string; revision: number }) {
  const requested = useRef<string | null>(null);

  useEffect(() => {
    const key = `${id}:${revision}`;
    if (requested.current === key) return;
    requested.current = key;
    void markQuoteNotificationRead(id, revision).catch(() => {
      requested.current = null;
    });
  }, [id, revision]);

  return null;
}
