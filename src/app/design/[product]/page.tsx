import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDesigner from "@/features/designer/product-designer";
import "@/features/designer/studio.css";

const names = { pens: "pen", shirts: "T-shirt", hats: "hat", lighters: "lighter" } as const;

export async function generateMetadata({ params }: { params: Promise<{ product: string }> }): Promise<Metadata> {
  const { product } = await params;
  if (!(product in names)) return {};
  const name = names[product as keyof typeof names];
  return { title: `Design a ${name} | Perty Print`, description: `Preview your own text or artwork printed on a ${name}.` };
}

export default async function ProductDesignPage({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  if (!(product in names)) notFound();
  return <ProductDesigner key={product} product={product as keyof typeof names} />;
}
