import Image from "next/image";
import Link from "next/link";
import IdeaTryout from "@/components/idea-tryout";
import FeaturedProducts from "@/components/featured-products";
import HeroVideo from "@/components/hero-video";
import { storefrontProducts } from "@/lib/catalog";
import type { DesignTemplate } from "@/lib/catalog-config";
import "./home.css";

const faqs = [
  { question: "Can I order online yet?", answer: "You can submit a design request for pens, T-shirts, or hats. Our team will review it and contact you about price and fulfillment. Paid checkout is still being prepared." },
  { question: "Can I upload my own design?", answer: "Yes, the design previews accept PNG, JPG, and WebP images up to 1 MB. You can also add text, choose colors, and move the design by mouse or touch." },
  { question: "Do you make the products themselves?", answer: "We start with ready-made items and print your artwork, words, or logo onto them." },
  { question: "What products will be available?", answer: "T-shirts, hats, and pens have live preview studios. Lighter previews are marked 18+." },
  { question: "What about custom lighters?", answer: "Lighter previews are available for adults 18+. Online ordering and checkout are unavailable." },
  { question: "Will you offer delivery or pickup?", answer: "Both are planned. Locations, service areas, and any costs will be displayed when ordering opens." },
];

export default async function HomePage() {
  const catalog = await storefrontProducts();
  const firstProductHref = catalog[0] ? `/design/${catalog[0].slug}` : "#products";
  const pen = catalog.find((item) => item.design_template === "pens");
  const studios: Partial<Record<DesignTemplate, string>> = {};
  for (const item of catalog) if (!item.image_url) studios[item.design_template] ??= `/design/${item.slug}`;

  return (
    <main className="pc-home">
      <section className="pc-hero" aria-labelledby="pc-hero-title">
        <HeroVideo />
        <div className="pc-hero-inner pc-wrap">
        <div className="pc-hero-copy">
          <span className="pc-kicker pc-kicker-pill">✳ &nbsp; CUSTOM PRINTING IN KOSOVO</span>
          <h1 id="pc-hero-title">Your design,<br />on <span>everyday things.</span></h1>
          <p>Turn your artwork, words, or logo into something you can hold and wear. Choose a product, make it yours, and see the print come to life.</p>
          <div className="pc-hero-actions"><Link href={firstProductHref} className="pc-button pc-button-dark">Start designing <span aria-hidden="true">↗</span></Link><a href="#shop-categories" className="pc-button pc-button-outline">Browse categories</a></div>
          <div className="pc-hero-facts"><span><b>✦</b> Your own design</span><span><b>◉</b> Preview on a product</span><span><b>⌂</b> Made in Kosovo</span></div>
          <p className="pc-hero-note">Design previews are open now. Product ordering is coming later.</p>
        </div>
        <div className="pc-hero-collage" aria-label="Examples of printed products">
          <div className="pc-collage-card pc-collage-pens"><Image src="/images/colorful-pens.png" alt="Colorful pens with printed designs" fill priority sizes="(max-width: 800px) 50vw, 22vw" /><span>Printed pens</span></div>
          <div className="pc-collage-card pc-collage-shirt"><Image src="/images/printed-tee-lifestyle.png" alt="Graphic printed on a T-shirt" fill priority sizes="(max-width: 800px) 50vw, 22vw" /><span>Graphic tees</span></div>
          <div className="pc-collage-card pc-collage-hat"><Image src="/images/printed-cap.png" alt="Custom printed baseball cap" fill sizes="(max-width: 800px) 50vw, 18vw" /><span>Custom hats</span></div>
          <div className="pc-collage-sticker">MAKE IT<br /><strong>YOURS</strong><i>✳</i></div>
        </div>
        </div>
      </section>

      <div className="pc-ticker" aria-label="Print shop categories"><div>YOUR DESIGN <span>✳</span> T-SHIRTS <span>✳</span> HATS <span>✳</span> PENS <span>✳</span> MADE IN KOSOVO <span>✳</span> YOUR DESIGN <span>✳</span> T-SHIRTS <span>✳</span> HATS <span>✳</span> PENS <span>✳</span> MADE IN KOSOVO <span>✳</span></div></div>

      {catalog.length > 0 ? <FeaturedProducts products={catalog} /> : <section className="pc-section pc-wrap" id="products"><p className="pc-section-note">No products are published yet. Publish a product in the admin catalog to show it here.</p></section>}

      <section className="pc-section pc-examples pc-wrap" id="try-design" aria-label="Try a design on a product">{Object.keys(studios).length > 0 && <IdeaTryout studios={studios} />}</section>

      <section className="pc-process" id="how-it-works"><div className="pc-wrap"><div className="pc-center-heading"><span className="pc-kicker">A SIMPLE PROCESS</span><h2>From your idea to a printed piece.</h2><p>Here is how customization will work as the shop opens.</p></div><div className="pc-process-grid"><article><span className="pc-process-icon">▦</span><span className="pc-process-number">01</span><h3>Choose an item</h3><p>Pick a ready-made product and its available color or size.</p></article><article><span className="pc-process-icon">✎</span><span className="pc-process-number">02</span><h3>Add your design</h3><p>Enter text or upload your artwork and place it on the item.</p></article><article><span className="pc-process-icon">◉</span><span className="pc-process-number">03</span><h3>Check the preview</h3><p>Adjust the position, scale, and color until it looks right.</p></article><article><span className="pc-process-icon">✳</span><span className="pc-process-number">04</span><h3>We print it</h3><p>When ordering opens, we will print your approved design.</p></article></div></div></section>

      <section className="pc-section pc-gallery pc-wrap" id="gallery"><div className="pc-section-heading"><div><span className="pc-kicker">THE GALLERY</span><h2>Prints with personality.</h2></div><p>A little inspiration for the designs, colors, and products that can make an idea tangible.</p></div><div className="pc-gallery-grid"><div className="pc-gallery-tile pc-gallery-large"><Image src="/images/printed-collection.png" alt="Several illustrated designs printed on T-shirts" fill sizes="(max-width: 700px) 100vw, 50vw" /><span>Wear your artwork</span></div><div className="pc-gallery-tile"><Image src="/images/colorful-pens.png" alt="Colorful custom pens" fill sizes="(max-width: 700px) 50vw, 25vw" /><span>Small details</span></div><div className="pc-gallery-tile"><Image src="/images/printed-cap.png" alt="Printed green cap" fill sizes="(max-width: 700px) 50vw, 25vw" /><span>Everyday accessories</span></div><div className="pc-gallery-tile"><Image src="/images/print-planning.png" alt="Printed products with artwork sketches" fill sizes="(max-width: 700px) 50vw, 25vw" /><span>From sketch to print</span></div><div className="pc-gallery-tile"><Image src="/images/printed-tee-lifestyle.png" alt="Person wearing a printed T-shirt" fill sizes="(max-width: 700px) 50vw, 25vw" /><span>Made to be seen</span></div></div></section>

      <section className="pc-studio pc-wrap" id="design-studio"><div className="pc-studio-copy"><span className="pc-kicker">TRY THE DESIGN STUDIO</span><h2>Choose your canvas.</h2><p>Choose a product and color, add a name or upload artwork, and drag the design into place. It works with a mouse or a touch screen.</p><ul><li>Text and image uploads</li><li>Move, resize, and rotate</li><li>Download a visual preview</li></ul><Link href={pen ? `/design/${pen.slug}` : firstProductHref} className="pc-button pc-button-orange">{pen ? "Design a pen" : "Choose a product"} <span aria-hidden="true">↗</span></Link><small>Preview only. Checkout is still in development.</small></div><div className="pc-studio-photo"><Image src="/images/printed-pens.png" alt="Pens with different printed patterns" fill sizes="(max-width: 750px) 100vw, 50vw" /></div></section>

      <section className="pc-section pc-ideas pc-wrap" id="ideas"><div className="pc-center-heading"><span className="pc-kicker">MADE FOR YOUR MOMENTS</span><h2>One print can say a lot.</h2><p>Give a personal idea a place on the things people use every day.</p></div><div className="pc-ideas-grid"><article><span>✳</span><h3>For yourself</h3><p>Wear a favorite illustration or put a small reminder on something you reach for every day.</p></article><article><span>◎</span><h3>For a group</h3><p>Make a shared design for a team, an event, or a moment you want to remember.</p></article><article><span>↗</span><h3>For your brand</h3><p>Turn a logo or message into a tangible item people can take with them.</p></article></div></section>

      <section className="pc-section pc-faq pc-wrap" id="faq"><div className="pc-center-heading"><span className="pc-kicker">QUESTIONS</span><h2>Everything you need to know.</h2></div><div className="pc-faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section>

      <section className="pc-final pc-wrap"><div><span className="pc-kicker">YOUR IDEA STARTS HERE</span><h2>Ready to make it yours?</h2><p>Try a product design now or create an account for when more products and ordering become available.</p><div><Link href={firstProductHref} className="pc-button pc-button-orange">Start designing <span aria-hidden="true">↗</span></Link><Link href="/register" className="pc-button pc-button-on-dark">Create an account</Link></div></div></section>
    </main>
  );
}
