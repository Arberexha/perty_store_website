import { NextRequest } from "next/server";

export function hasValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const submitted = new URL(origin);
    const host = request.headers.get("host");
    return submitted.protocol === request.nextUrl.protocol && submitted.host === host;
  } catch {
    return false;
  }
}
