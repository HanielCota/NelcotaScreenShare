import { useRef } from "react";
import { useScrollReveal } from "@/features/home/hooks/use-scroll-reveal";
import { ProductDemo } from "./demo/ProductDemo";
import { StepsSection } from "./StepsSection";

/**
 * Everything below the hero, in the order a first-time visitor needs it: see it working,
 * learn the steps, the details, whether their browser fits, trust, doubts, then act.
 */
export function HomeSections() {
  const scope = useRef<HTMLDivElement>(null);
  useScrollReveal(scope);

  return (
    <div ref={scope} className="flex w-full flex-col items-center gap-28 sm:gap-40">
      <ProductDemo />
      <StepsSection />
    </div>
  );
}
