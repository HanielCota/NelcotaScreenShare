import { useRef } from "react";
import { NavigationType, useNavigationType } from "react-router";
import { useGSAP } from "@/lib/animation/gsap";
import { ScrollTrigger } from "@/lib/animation/gsap-scroll";
import { useReferenceFx } from "@/features/home/hooks/use-reference-fx";
import { BrowserCheckSection } from "./BrowserCheckSection";
import { ChangelogSection } from "./ChangelogSection";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { FinalCta } from "./FinalCta";
import { PricingSection } from "./PricingSection";
import { StatementScene } from "./scenes/StatementScene";
import { PrivacyScene } from "./scenes/PrivacyScene";
import { ProductScene } from "./scenes/ProductScene";
import { UseCasesScene } from "./scenes/UseCasesScene";

/** The element a "#section" link points at, if the hash names one. */
function hashTarget(): HTMLElement | null {
  const id = window.location.hash.slice(1);
  if (!id) return null;
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null;
  }
}

/** The page itself was just opened (typed, linked or reloaded), not restored from history. */
function isFreshPageLoad(): boolean {
  const [entry] = performance.getEntriesByType("navigation");
  return entry instanceof PerformanceNavigationTiming && entry.type !== "back_forward";
}

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

  const navigationType = useNavigationType();

  // Pins add scroll length once fonts and layout settle: measure again, then honor a
  // "#section" link, whose position only exists after the pins are in place. Not on back or
  // forward, where the browser restores the reading position on its own.
  useGSAP(
    () => {
      const honorHash = navigationType !== NavigationType.Pop || isFreshPageLoad();
      let mounted = true;
      void document.fonts.ready.then(() => {
        if (!mounted) return;
        ScrollTrigger.refresh();
        if (honorHash) hashTarget()?.scrollIntoView();
      });
      return () => {
        mounted = false;
      };
    },
    { scope },
  );

  return (
    // A block, not flex: ScrollTrigger turns pin spacing off under a flex parent, and the
    // following scenes would then scroll over the pinned one.
    <div ref={scope} className="w-full">
      <ProductScene />
      <StatementScene />
      <UseCasesScene />
      <PrivacyScene />
      <div
        ref={reference}
        className="flex w-full flex-col items-center gap-28 px-4 pt-28 sm:gap-40 sm:px-6 sm:pt-40"
      >
        <FeaturesSection maxParticipants={maxParticipants} />
        <BrowserCheckSection />
        <PricingSection maxParticipants={maxParticipants} signedIn={signedIn} />
        <ChangelogSection />
        <FaqSection maxParticipants={maxParticipants} />
      </div>
      <FinalCta signedIn={signedIn} />
    </div>
  );
}
