import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PERTY_E2E === "1" ? ".next-e2e" : ".next",
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{ source: "/track/:token", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] }];
  },
};

export default nextConfig;
