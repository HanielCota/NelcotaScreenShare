import { useRef } from "react";
import { useScrollReveal } from "@/features/home/hooks/use-scroll-reveal";
import { BrowserCheckSection } from "./BrowserCheckSection";
import { ProductDemo } from "./demo/ProductDemo";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { StepsSection } from "./StepsSection";
import { TrustSection } from "./TrustSection";

/**
 * Everything below the hero, in the order a first-time visitor needs it: see it working,
 * learn the steps, the details, whether their browser fits, trust, doubts, then act.
 */
export function HomeSections({ maxParticipants }: { maxParticipants: number }) {
  const scope = useRef<HTMLDivElement>(null);
  useScrollReveal(scope);

  return (
    <div ref={scope} className="flex w-full flex-col items-center gap-28 sm:gap-40">
      <ProductDemo />
      <StepsSection />
      <FeaturesSection maxParticipants={maxParticipants} />
      <BrowserCheckSection />
      <TrustSection />
      <FaqSection maxParticipants={maxParticipants} />
    </div>
  );
}
