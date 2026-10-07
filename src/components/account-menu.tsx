"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function AccountMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) menuRef.current?.removeAttribute("open");
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") menuRef.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <details ref={menuRef} className="account-menu"><summary className="account-link">My account <span aria-hidden="true">▾</span></summary><div className="account-menu-list"><Link href="/account?section=quotes" onClick={() => menuRef.current?.removeAttribute("open")}>My quotes</Link><Link href="/account?section=designs" onClick={() => menuRef.current?.removeAttribute("open")}>My designs</Link><Link href="/account?section=orders" onClick={() => menuRef.current?.removeAttribute("open")}>My orders</Link></div></details>;
}
