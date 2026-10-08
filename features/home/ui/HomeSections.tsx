import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/animation/gsap";
import { ScrollTrigger } from "@/lib/animation/gsap-scroll";
import { useReferenceFx } from "@/features/home/hooks/use-reference-fx";
import { BrowserCheckSection } from "./BrowserCheckSection";
import { ChangelogSection } from "./ChangelogSection";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { FinalCta } from "./FinalCta";
import { PricingSection } from "./PricingSection";
import { ManifestoScene } from "./scenes/ManifestoScene";
import { PrivacyScene } from "./scenes/PrivacyScene";
import { ProductScene } from "./scenes/ProductScene";
import { StepsScene } from "./scenes/StepsScene";
import { UseCasesScene } from "./scenes/UseCasesScene";

/**
 * Below the hero: first the story, told in pinned scroll scenes (product, why, use cases,
 * steps, privacy); then the reference sections, which scroll normally because people read,
 * compare and click there (details, browsers, price, updates, questions, call to action).
 */
export function HomeSections({
  maxParticipants,
  signedIn,
}: {
  maxParticipants: number;
  signedIn: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const reference = useRef<HTMLDivElement>(null);
  useReferenceFx(reference);

  // Pins add scroll length once fonts and layout settle: measure again, then honor a
  // "#section" link, whose position only exists after the pins are in place. While a dark
  // stage passes under the fixed navigation, the bar turns dark too.
  useGSAP(
    () => {
      const header = scope.current?.closest("main")?.querySelector("header");
      for (const stage of gsap.utils.toArray<HTMLElement>(".stage", scope.current)) {
        // A pinned section sits inside a pin-spacer, which holds its whole scroll length.
        const spacer = stage.parentElement?.classList.contains("pin-spacer");
        ScrollTrigger.create({
          trigger: spacer ? stage.parentElement : stage,
          start: "top 40px",
          end: "bottom 40px",
          toggleClass: header ? { targets: header, className: "over-stage" } : undefined,
        });
      }
      void document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
        const target = window.location.hash && document.querySelector(window.location.hash);
        if (target instanceof HTMLElement) target.scrollIntoView();
      });
    },
    { scope },
  );

  return (
    // A block, not flex: ScrollTrigger turns pin spacing off under a flex parent, and the
    // following scenes would then scroll over the pinned one.
    <div ref={scope} className="w-full">
      <ProductScene />
      <ManifestoScene />
      <UseCasesScene />
      <StepsScene />
      <PrivacyScene />
      <div
        ref={reference}
        className="flex w-full flex-col items-center gap-28 px-4 pt-28 sm:gap-40 sm:px-8 sm:pt-40"
      >
        <FeaturesSection maxParticipants={maxParticipants} />
        <BrowserCheckSection />
        <PricingSection maxParticipants={maxParticipants} signedIn={signedIn} />
        <ChangelogSection />
        <FaqSection maxParticipants={maxParticipants} />
        <FinalCta signedIn={signedIn} />
      </div>
    </div>
  );
}
