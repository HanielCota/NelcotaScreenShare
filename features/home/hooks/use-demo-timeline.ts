import type { RefObject } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";
import { ScrollTrigger } from "@/lib/animation/gsap-scroll";

/** Seconds each caption stays active. */
const STEP = 3.4;
const DIM = 0.45;

/**
 * Plays the room demo as three chapters (share with sound, point, react), in a loop,
 * only while it is on screen. The captions with `data-demo-step` follow along, each
 * with a progress bar (`data-demo-progress`). With reduced motion the static final
 * picture stays.
 */
export function useDemoTimeline(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES.motion, () => {
        const q = gsap.utils.selector(scope);
        const captions = q("[data-demo-step]");
        const progress = q("[data-demo-progress]");
        const part = (name: string) => q(`[data-demo=${name}]`);
        const screen = part("screen");
        const badge = part("badge");
        const pointer = part("pointer");
        const ripple = part("ripple");
        const target = part("target");
        const reaction = part("reaction");
        const hand = part("hand");
        const chat = part("chat");

        const levels = gsap.to(q("[data-demo=level]"), {
          scaleY: 0.35,
          duration: 0.28,
          ease: "sine.inOut",
          stagger: { each: 0.09, repeat: -1, yoyo: true },
          paused: true,
        });

        const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 });
        tl.set(screen, { opacity: 0, scale: 0.96 })
          .set(q("[data-demo=bar]"), { scaleY: 0 })
          .set([badge, hand, chat], { opacity: 0, y: 8 })
          .set(pointer, { x: 0, y: 0, xPercent: 18, yPercent: 88, opacity: 0 })
          .set(ripple, { scale: 0.4, opacity: 0 })
          .set(reaction, { opacity: 0, y: 12, scale: 0.6 })
          .set(captions, { opacity: DIM })
          .set(progress, { scaleX: 0 });

        // 1. The screen arrives, with the sound indicator.
        tl.addLabel("share", 0.2)
          .to(captions[0] ?? [], { opacity: 1, duration: 0.3 }, "share")
          .to(progress[0] ?? [], { scaleX: 1, duration: STEP, ease: "none" }, "share")
          .to(screen, { opacity: 1, scale: 1, duration: 0.6 }, "share+=0.1")
          .to(q("[data-demo=bar]"), { scaleY: 1, duration: 0.5, stagger: 0.06 }, "share+=0.4")
          .to(badge, { opacity: 1, y: 0, duration: 0.4 }, "share+=0.9");

        // 2. Ana's pointer travels to the button and "clicks".
        tl.addLabel("point", `share+=${STEP}`)
          .to(captions[0] ?? [], { opacity: DIM, duration: 0.3 }, "point")
          .to(captions[1] ?? [], { opacity: 1, duration: 0.3 }, "point")
          .to(progress[1] ?? [], { scaleX: 1, duration: STEP, ease: "none" }, "point")
          .to(pointer, { opacity: 1, duration: 0.3 }, "point+=0.1")
          .to(
            pointer,
            { xPercent: 80, yPercent: 12, duration: 1.2, ease: "power2.inOut" },
            "point+=0.2",
          )
          .to(target, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 }, "point+=1.45")
          .fromTo(
            ripple,
            { scale: 0.4, opacity: 0.9 },
            { scale: 2.4, opacity: 0, duration: 0.6, immediateRender: false },
            "point+=1.45",
          );

        // 3. Participation without interrupting: hand, reaction and chat.
        tl.addLabel("react", `point+=${STEP}`)
          .to(captions[1] ?? [], { opacity: DIM, duration: 0.3 }, "react")
          .to(captions[2] ?? [], { opacity: 1, duration: 0.3 }, "react")
          .to(progress[2] ?? [], { scaleX: 1, duration: STEP, ease: "none" }, "react")
          .to(hand, { opacity: 1, y: 0, duration: 0.35 }, "react+=0.1")
          .to(
            reaction,
            { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(2)" },
            "react+=0.5",
          )
          .to(chat, { opacity: 1, y: 0, duration: 0.35 }, "react+=1")
          .to(reaction, { y: -32, opacity: 0, duration: 0.8 }, "react+=1.7")
          .to([screen, badge, pointer, hand, chat], { opacity: 0, duration: 0.4 }, `react+=${STEP}`)
          .to(captions[2] ?? [], { opacity: DIM, duration: 0.3 }, `react+=${STEP}`);

        ScrollTrigger.create({
          trigger: scope.current,
          start: "top 75%",
          end: "bottom 25%",
          onToggle: ({ isActive }) => {
            tl.paused(!isActive);
            levels.paused(!isActive);
          },
        });
      });
    },
    { scope },
  );
}
