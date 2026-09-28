"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const revealTargets = [
  ".pc-home .pc-center-heading > *",
  ".pc-home .pc-section-heading > *",
  ".pc-home .pc-category-card",
  ".pc-home .pc-tryout",
  ".pc-home .pc-process-grid article",
  ".pc-home .pc-gallery-tile",
  ".pc-home .pc-studio-copy > *",
  ".pc-home .pc-studio-photo",
  ".pc-home .pc-ideas-grid article",
  ".pc-home .pc-faq-list details",
  ".pc-home .pc-final > div > *",
  ".studio-page .studio-heading > *",
  ".studio-page .studio-preview",
  ".studio-page .studio-tools",
  ".auth-page .auth-copy",
  ".auth-page .auth-card",
  ".inner-page > *",
].join(", ");

export default function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(revealTargets));
    if (!elements.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.08, rootMargin: "0px 0px -35px 0px" });
    }

    elements.forEach((element, index) => {
      element.classList.add("motion-item");
      element.style.setProperty("--motion-delay", `${(index % 4) * 70}ms`);
      const rect = element.getBoundingClientRect();
      if (!observer || (rect.top < window.innerHeight * 0.9 && rect.bottom > 0)) element.classList.add("is-visible");
      else observer.observe(element);
    });
    document.documentElement.classList.add("motion-enabled");

    return () => {
      observer?.disconnect();
      document.documentElement.classList.remove("motion-enabled");
    };
  }, [pathname]);

  return null;
}
