import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CreateRoomButton } from "./CreateRoomButton";
import { ProWaitlistForm } from "./ProWaitlistForm";
import { SectionIntro } from "./SectionIntro";

function Plan({
  name,
  price,
  unit,
  summary,
  badge,
  features,
  highlighted = false,
  children,
}: {
  name: string;
  price: string;
  unit: string;
  summary: string;
  badge?: string;
  features: string[];
  highlighted?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "panel flex flex-col gap-6 rounded-2xl p-6 sm:p-8",
        highlighted && "border-brand/40",
      )}
    >
      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-lg">
          {name}
          {badge ? (
            <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand-soft">
              {badge}
            </span>
          ) : null}
        </h3>
        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-medium tracking-tight tabular-nums">{price}</span>
          <span className="text-sm text-ink-muted">{unit}</span>
        </p>
        <p className="text-sm text-pretty text-ink-muted">{summary}</p>
      </div>
      <ul className="flex flex-col gap-2.5 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-soft" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-auto">{children}</div>
    </li>
  );
}

/**
 * Free today, Pro announced. The free plan lists only what the product does now; the Pro
 * has no checkout yet, so it collects e-mails for the launch.
 */
export function PricingSection({
  maxParticipants,
  signedIn,
}: {
  maxParticipants: number;
  signedIn: boolean;
}) {
  return (
    <section id="precos" aria-labelledby="pricing-title" className="w-full max-w-4xl scroll-mt-28">
      <SectionIntro id="pricing-title" title="Preços" />

      <ul className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-2">
        <Plan
          name="Grátis"
          price="R$ 0"
          unit="para sempre"
          summary="Tudo o que você precisa para mostrar a tela ao time hoje."
          features={[
            `Salas de até ${maxParticipants} pessoas`,
            "Convidados entram pelo link, sem criar conta",
            "Som do computador, ponteiro, chat e reações",
            "Nada é gravado",
          ]}
          highlighted
        >
          <CreateRoomButton signedIn={signedIn} />
        </Plan>
        <Plan
          name="Pro"
          price="R$ 19"
          unit="por pessoa/mês"
          badge="Em breve"
          summary="Para times que usam o Nelcota todos os dias."
          features={[
            "Salas maiores",
            "Sem limite de tempo nas salas",
            "Salas fixas do time, com link permanente",
            "Painel do time: histórico, membros e convites",
          ]}
        >
          <ProWaitlistForm />
        </Plan>
      </ul>
    </section>
  );
}
