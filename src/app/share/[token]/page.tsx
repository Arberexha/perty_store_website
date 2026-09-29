import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool } from "@/lib/db";

export const metadata: Metadata = { title: "Shared design | Perty Print", robots: { index: false, follow: false } };

export default async function SharedDesignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) notFound();
  const result = await getPool().query<{ name: string; product_name: string }>("SELECT name,product_name FROM saved_designs WHERE share_token=$1", [token]);
  const design = result.rows[0];
  if (!design) notFound();
  return <main className="inner-page shared-design-page"><span className="eyebrow">SHARED PREVIEW</span><h1>{design.name}</h1><p>A visual preview of a custom {design.product_name} design. The editable artwork stays in its creator’s account.</p><div className="shared-design-image"><Image src={`/share/${token}/preview`} alt={`Preview of ${design.name}`} width={1000} height={420} unoptimized /></div><Link className="button" href="/#shop-categories">Create your own design →</Link></main>;
}
