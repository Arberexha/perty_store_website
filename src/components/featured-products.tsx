"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { templateVisuals } from "@/lib/catalog-config";
import type { DesignTemplate } from "@/lib/catalog-config";
import type { StorefrontProduct } from "@/lib/catalog";

const categories: { value: DesignTemplate; label: string }[] = [
  { value: "pens", label: "Pens" },
  { value: "shirts", label: "T-shirts" },
  { value: "hats", label: "Hats" },
  { value: "lighters", label: "Lighters 18+" },
];

// Display examples do not add catalog records or design studio choices.
const examples: { name: string; image: string; template: DesignTemplate }[] = [
  { name: "Graphic print T-shirt", image: "/images/printed-tee-lifestyle.png", template: "shirts" },
  { name: "Botanical print T-shirt", image: "/images/printed-shirt.png", template: "shirts" },
  { name: "Illustrated T-shirt collection", image: "/images/printed-collection.png", template: "shirts" },
  { name: "Colorful printed pens", image: "/images/colorful-pens.png", template: "pens" },
  { name: "Nature print pen set", image: "/images/printed-pens.png", template: "pens" },
  { name: "Sun print cap", image: "/images/printed-cap.png", template: "hats" },
  { name: "Botanical print lighter", image: "/images/printed-lighter.png", template: "lighters" },
];

type DisplayCard = {
  key: string;
  name: string;
  template: DesignTemplate;
  image: string;
  href: string;
  customImage: boolean;
  example: boolean;
  ageRestricted: boolean;
};

export default function FeaturedProducts({ products }: { products: StorefrontProduct[] }) {
  const [selected, setSelected] = useState<DesignTemplate | "all">("all");
  const productCards: DisplayCard[] = products.map((item) => ({
    key: item.id,
    name: item.name,
    template: item.design_template,
    image: item.image_url ?? templateVisuals[item.design_template].image,
    href: `/design/${item.slug}`,
    customImage: Boolean(item.image_url),
    example: false,
    ageRestricted: item.age_restricted,
  }));
  const exampleCards: DisplayCard[] = examples.flatMap((example) => {
    const studio = products.find((item) => item.design_template === example.template);
    if (!studio) return [];
    return [{
      key: `example-${example.name}`,
      name: example.name,
      template: example.template,
      image: example.image,
      href: `/design/${studio.slug}`,
      customImage: false,
      example: true,
      ageRestricted: studio.age_restricted,
    }];
  });
  const cards = [...productCards, ...exampleCards];
  const availableCategories = categories.filter((category) => cards.some((card) => card.template === category.value));
  const visibleCards = selected === "all" ? cards : cards.filter((card) => card.template === selected);

  return (
    <section className="pc-section pc-featured pc-wrap" id="products" aria-labelledby="pc-featured-title">
      <div className="pc-section-heading">
        <div><span className="pc-kicker">WHAT WE CAN CREATE</span><h2 id="pc-featured-title">Products and print ideas.</h2></div>
        <p>Explore our products and sample designs, then create your own.</p>
      </div>
      <div className="pc-product-filters" id="shop-categories" role="group" aria-label="Filter products by category">
        <button type="button" className={selected === "all" ? "is-active" : ""} aria-pressed={selected === "all"} onClick={() => setSelected("all")}>All</button>
        {availableCategories.map((category) => (
          <button type="button" key={category.value} className={selected === category.value ? "is-active" : ""} aria-pressed={selected === category.value} onClick={() => setSelected(category.value)}>{category.label}</button>
        ))}
      </div>
      <div className="pc-featured-grid">
        {visibleCards.map((card) => (
          <article className="pc-product-card" key={card.key}>
            <Link href={card.href} className="pc-product-card-link" aria-label={`${card.example ? "Create something like" : "Design"} ${card.name}`}>
              <div className="pc-product-card-image">
                <Image src={card.image} alt={card.name} unoptimized={card.customImage} fill sizes="(max-width: 600px) 50vw, (max-width: 900px) 45vw, 25vw" />
                <span className="pc-product-card-badge">{card.example ? "Sample print" : card.ageRestricted ? "18+ preview" : "Customize it"}</span>
              </div>
              <div className="pc-product-card-body">
                <span className="pc-product-card-category">{categories.find((category) => category.value === card.template)?.label}</span>
                <h3>{card.name}</h3>
                <div className="pc-product-card-bottom"><span>{card.example ? "Example design" : "Design preview"}</span><span className="pc-product-card-action">{card.example ? "Try it" : "Explore"} <span aria-hidden="true">↗</span></span></div>
              </div>
            </Link>
          </article>
        ))}
      </div>
      <p className="pc-section-note">Sample prints are examples of what we can make. Online checkout is coming later. Lighter previews are for adults 18+ only.</p>
    </section>
  );
}
