"use client";

import { useState } from "react";

export function ShareLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copied link" : "Copy share link"}</button>;
}
