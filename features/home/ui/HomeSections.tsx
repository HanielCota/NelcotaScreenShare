import { BrowserCheckSection } from "./BrowserCheckSection";
import { ChangelogSection } from "./ChangelogSection";
import { ProductDemo } from "./demo/ProductDemo";
import { FaqSection } from "./FaqSection";
import { FeaturesSection } from "./FeaturesSection";
import { FinalCta } from "./FinalCta";
import { PricingSection } from "./PricingSection";
import { StepsSection } from "./StepsSection";
import { UseCasesSection } from "./UseCasesSection";

/**
 * Everything below the hero, in the order a first-time visitor needs it: see it working,
 * recognize their own day, learn the steps and details, check their browser and the price,
 * see the product moves, clear the last doubts, then act.
 */
export function HomeSections({
  maxParticipants,
  signedIn,
}: {
  maxParticipants: number;
  signedIn: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-28 sm:gap-40">
      <ProductDemo />
      <UseCasesSection />
      <StepsSection />
      <FeaturesSection maxParticipants={maxParticipants} />
      <BrowserCheckSection />
      <PricingSection maxParticipants={maxParticipants} signedIn={signedIn} />
      <ChangelogSection />
      <FaqSection maxParticipants={maxParticipants} />
      <FinalCta signedIn={signedIn} />
    </div>
  );
}
