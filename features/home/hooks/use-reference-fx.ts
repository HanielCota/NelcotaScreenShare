import type { RefObject } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

/** Fully open, with room for focus rings and shadows; closed, everything to the right is cut. */
const OPEN = "inset(-12px -12px -12px -12px)";
const CLOSED = "inset(-12px 100% -12px -12px)";

/** A scroll window for one element: the effect plays while it crosses this band. */
function band(trigger: Element, start = "top 92%", end = "top 62%") {
  return { trigger, start, end, scrub: 0.6 };
}

/**
 * Scroll effects for the reference sections (details, browsers, price, updates, FAQ, call to
 * action), read from `data-fx` marks. Every effect is scrubbed, so it plays forward and back
 * with the scroll instead of firing once; with reduced motion none of them is created and the
 * content stays as rendered.
 */
export function useReferenceFx(scope: RefObject<HTMLElement | null>) {
  useScrollScene(scope, (root) => {
    const all = (mark: string) => gsap.utils.toArray<HTMLElement>(`[data-fx=${mark}]`, root);

    // Titles rise into place; their quieter second line is unveiled left to right.
    for (const title of all("title")) {
      gsap.from(title, { y: 56, opacity: 0.12, ease: "none", scrollTrigger: band(title) });
      const sub = title.querySelector("[data-fx-sub]");
      if (!sub) continue;
      gsap.fromTo(
        sub,
        { clipPath: CLOSED },
        { clipPath: OPEN, ease: "none", scrollTrigger: band(title, "top 82%", "top 45%") },
      );
    }

    // List items are drawn left to right, rule included.
    for (const item of all("sweep")) {
      gsap.fromTo(
        item,
        { clipPath: CLOSED, x: -16 },
        { clipPath: OPEN, x: 0, ease: "none", scrollTrigger: band(item, "top 94%", "top 72%") },
      );
    }

    // Table rows slide in one after the other.
    for (const row of all("row")) {
      gsap.from(row, {
        opacity: 0.08,
        x: -32,
        ease: "none",
        scrollTrigger: band(row, "top 95%", "top 75%"),
      });
    }

    // Price cards stand up from a tilt, like cards placed on a table.
    for (const card of all("card")) {
      gsap.from(card, {
        y: 96,
        rotateX: 16,
        opacity: 0.25,
        transformPerspective: 1100,
        transformOrigin: "50% 100%",
        ease: "none",
        scrollTrigger: band(card, "top 98%", "top 58%"),
      });
    }

    // Questions rise in a cascade.
    for (const item of all("rise")) {
      gsap.from(item, {
        y: 40,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: band(item, "top 96%", "top 78%"),
      });
    }

    // The closing card grows to its full width as it reaches the middle of the screen.
    for (const card of all("expand")) {
      gsap.fromTo(
        card,
        { scale: 0.84, borderRadius: "4rem" },
        {
          scale: 1,
          borderRadius: "2rem",
          ease: "none",
          scrollTrigger: band(card, "top bottom", "top 30%"),
        },
      );
    }
  });
}
