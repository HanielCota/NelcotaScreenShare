import { useRef } from "react";
import { useStageHeader } from "@/features/home/hooks/use-stage-header";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

/**
 * One line, zoomed by the scroll: it starts small and dim in the middle of the stage, grows
 * until it fills the screen, then a mint line strikes the question everyone is tired of
 * asking. Without motion it shows the final picture, already struck through.
 */
export function StatementScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const q = gsap.utils.selector(section);
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=170%",
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
      },
    });
    tl.fromTo(
      q("[data-statement]"),
      { scale: 0.32, opacity: 0.15 },
      { scale: 1, opacity: 1, duration: 1, ease: "power2.out" },
    )
      .fromTo(
        q("[data-statement-strike]"),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.45, ease: "power2.inOut" },
        ">0.1",
      )
      .to(q("[data-statement-quote]"), { opacity: 0.45, duration: 0.3 }, "<0.2")
      .to({}, { duration: 0.35 });
  });
  useStageHeader(scope);

  return (
    <section ref={scope} aria-labelledby="statement-title" className="stage w-full overflow-hidden">
      <div className="page-column grid min-h-svh place-items-center py-24">
        <h2
          id="statement-title"
          data-statement
          className="text-center text-[min(8vw,5.5rem)] leading-[1.02] font-semibold tracking-[-0.05em] will-change-transform"
        >
          Chega de
          {/* One line, so the strike crosses exactly the quote. */}
          <span className="relative mx-auto block w-fit whitespace-nowrap">
            <span data-statement-quote className="text-(--stage-muted)">
              “tá vendo minha tela?”
            </span>
            <span
              data-statement-strike
              aria-hidden="true"
              className="absolute inset-x-[-0.04em] top-[54%] h-[0.08em] origin-left rounded-full bg-brand"
            />
          </span>
        </h2>
      </div>
    </section>
  );
}
