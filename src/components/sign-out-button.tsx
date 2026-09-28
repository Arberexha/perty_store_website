"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-button"
      type="button"
      onClick={async () => {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (response.ok) {
          router.push("/");
          router.refresh();
        }
      }}
    >
      Sign out
    </button>
  );
}
