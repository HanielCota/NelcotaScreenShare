import type { RefObject } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

/** Scroll length of the pinned scene, in viewport heights (one per chapter, plus a pause). */
const SCENE_LENGTH = "+=420%";

/**
 * Product scene: the window rises as the stage enters, then the frame pins and the scroll
 * drives the chapters (share, sound, pointer, participation). Everything starts from the
 * static markup, so without motion the final picture and the full list stay as they are.
 */
export function useProductScene(scope: RefObject<HTMLElement | null>) {
  useScrollScene(scope, (section) => {
    const select = gsap.utils.selector(section);
    const frame = select("[data-scene-frame]")[0];
    const chapters = select("[data-chapter]");
    const progress = select("[data-chapter-progress]");
    const part = (name: string) => select(`[data-demo=${name}]`);
    const screen = part("screen");
    const pointer = part("pointer");

    gsap.set(section, { attr: { "data-scene": "live" } });

    // The window rises into place while the stage scrolls in.
    gsap.from(select("[data-scene-window]"), {
      y: 140,
      scale: 0.88,
      opacity: 0.4,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "top top", scrub: true },
    });

    const timeline = gsap.timeline({
      defaults: { duration: 0.5, ease: "power2.out" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: SCENE_LENGTH,
        pin: frame,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });

    timeline
      .set(chapters, { opacity: 0, y: 28 })
      .set(chapters[0] ?? [], { opacity: 1, y: 0 })
      .set(screen, { opacity: 0, scale: 0.96 })
      .set(part("terminal"), { opacity: 0, y: 12 })
      .set(part("iris"), { opacity: 0, x: 24, scale: 0.92 })
      .set(part("count-before"), { opacity: 1 })
      .set(part("count-after"), { opacity: 0 })
      .set([part("badge"), part("hand"), part("chat"), part("guest")], { opacity: 0, y: 8 })
      // The pointer rests on the bug in the markup; it starts far below and to the right.
      .set(pointer, { xPercent: 900, yPercent: 700, opacity: 0 })
      .set(part("ripple"), { scale: 0.4, opacity: 0 })
      .set(part("reaction"), { opacity: 0, y: 12, scale: 0.6 })
      .set(progress, { scaleX: 0 });

    /** Swaps the caption: the previous one leaves upward as the next one rises. */
    const chapter = (index: number, at: number) => {
      timeline
        .addLabel(`chapter-${index}`, at)
        .to(progress[index] ?? [], { scaleX: 1, duration: 1, ease: "none" }, at);
      if (index === 0) return;
      timeline
        .to(chapters[index - 1] ?? [], { opacity: 0, y: -28, duration: 0.3 }, at)
        .to(chapters[index] ?? [], { opacity: 1, y: 0, duration: 0.3 }, at + 0.15);
    };

    // 1. Bruno's editor arrives whole, then the error lands in the terminal with a flash.
    chapter(0, 0);
    timeline
      .to(screen, { opacity: 1, scale: 1 }, 0.05)
      .to(part("terminal"), { opacity: 1, y: 0 }, 0.45)
      .fromTo(
        part("terminal"),
        { backgroundColor: "rgb(255 107 107 / 0.28)" },
        { backgroundColor: "rgb(20 20 23 / 1)", duration: 0.35, immediateRender: false },
        0.6,
      );

    // 2. The computer's sound comes along.
    chapter(1, 1);
    timeline.to(part("badge"), { opacity: 1, y: 0 }, 1.15).to(
      [...part("level"), ...part("tile-level")],
      {
        scaleY: 0.35,
        duration: 0.12,
        stagger: 0.04,
        repeat: 5,
        yoyo: true,
        ease: "sine.inOut",
      },
      1.3,
    );

    // 3. Ana's pointer travels to the bug and "clicks" on it.
    chapter(2, 2);
    timeline
      .to(pointer, { opacity: 1, duration: 0.2 }, 2.1)
      .to(pointer, { xPercent: 0, yPercent: 0, duration: 0.6, ease: "power2.inOut" }, 2.15)
      .fromTo(
        part("target"),
        { backgroundColor: "rgb(255 107 107 / 0)" },
        { backgroundColor: "rgb(255 107 107 / 0.22)", duration: 0.2 },
        2.75,
      )
      .fromTo(
        part("ripple"),
        { scale: 0.4, opacity: 0.9 },
        { scale: 2.4, opacity: 0, duration: 0.3, immediateRender: false },
        2.75,
      );

    // 4. Everyone takes part, and a guest joins through the link.
    chapter(3, 3);
    timeline
      .to(part("iris"), { opacity: 1, x: 0, scale: 1 }, 3.05)
      .to(part("count-before"), { opacity: 0, duration: 0.2 }, 3.1)
      .to(part("count-after"), { opacity: 1, duration: 0.2 }, 3.15)
      .to(part("guest"), { opacity: 1, y: 0 }, 3.1)
      .to(part("hand"), { opacity: 1, y: 0 }, 3.25)
      .to(part("reaction"), { opacity: 1, y: 0, scale: 1, ease: "back.out(2)" }, 3.4)
      .to(part("chat"), { opacity: 1, y: 0 }, 3.55)
      // A short hold on the full picture before the stage scrolls away.
      .to({}, { duration: 0.4 }, 4);
  });
}
