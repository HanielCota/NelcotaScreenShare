import { BrowserCheckSection } from "./BrowserCheckSection";
import { ProductDemo } from "./demo/ProductDemo";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { StepsSection } from "./StepsSection";

/**
 * Everything below the hero, in the order a first-time visitor needs it: see it working,
 * learn the steps, the details, whether their browser fits, then the remaining doubts.
 */
export function HomeSections({ maxParticipants }: { maxParticipants: number }) {
  return (
    <div className="flex w-full flex-col items-center gap-28 sm:gap-40">
      <ProductDemo />
      <StepsSection />
      <FeaturesSection maxParticipants={maxParticipants} />
      <BrowserCheckSection />
      <FaqSection maxParticipants={maxParticipants} />
    </div>
  );
}
