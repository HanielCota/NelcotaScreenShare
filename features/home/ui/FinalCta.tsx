import { Check } from "lucide-react";
import { useRef } from "react";
import { useStageHeader } from "@/features/home/hooks/use-stage-header";
import { HomeStart } from "./HomeStart";

const FACTS = ["Grátis", "Sem instalar nada", "Sem cartão"];

/**
 * Closing call to action on a black stage: the same bar as the top of the page, mascots
 * included, so whoever reads to the end creates the room right here. The stage carries the
 * dark material too, so the bar looks the same in both themes.
 */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  const scope = useRef<HTMLElement>(null);
  useStageHeader(scope);

  return (
    <section
      ref={scope}
      aria-labelledby="cta-title"
      className="stage over-stage mt-28 w-full sm:mt-40"
    >
      <div className="page-column flex min-h-[85svh] flex-col items-center justify-center gap-6 py-24 text-center">
        <h2
          id="cta-title"
          className="text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-balance"
        >
          Mostre sua tela.
          <span className="block text-brand-soft">Agora.</span>
        </h2>
        <p className="max-w-lg text-lg leading-relaxed text-pretty text-(--stage-muted) sm:text-xl">
          Crie a sala, mande o link e, em menos de um minuto, todo mundo está vendo a mesma tela.
        </p>
        <div className="mt-4 w-full max-w-2xl">
          <HomeStart invalidCode={false} signedIn={signedIn} focusShortcut={false} />
        </div>
        <ul
          aria-label="Sem letras miúdas"
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-(--stage-muted)"
        >
          {FACTS.map((fact) => (
            <li key={fact} className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-brand-soft" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
