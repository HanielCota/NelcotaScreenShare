"use client";

import { Check } from "lucide-react";
import { Mascot } from "@/components/Mascot";

/**
 * Lado do mascote no painel de acesso: ele reage ao formulário ao lado, com
 * o que o Nelcota faz embaixo. No celular vira uma faixa no topo do painel.
 */
export function BrandPanel({ maxParticipants }: { maxParticipants: number }) {
  const perks = [
    `Até ${maxParticipants} pessoas por sala`,
    "Tela e áudio do sistema",
    "Link pronto para mandar",
  ];
  return (
    <aside className="flex items-center gap-4 border-b border-line bg-surface-2 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklch,var(--color-brand)_20%,transparent),transparent_65%)] px-5 py-4 sm:px-8 lg:flex-col lg:justify-center lg:gap-8 lg:border-r lg:border-b-0 lg:p-10">
      <Mascot className="size-20 sm:size-24 lg:size-52" sizes="(min-width: 1024px) 624px, 288px" />
      <div className="flex min-w-0 flex-col gap-4 lg:items-center lg:text-center">
        <p className="text-base font-semibold text-balance sm:text-lg lg:text-2xl lg:leading-snug lg:font-bold lg:tracking-tight">
          Compartilhe a tela em segundos, sem instalar nada.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-ink-muted max-lg:hidden">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-brand/20">
                <Check className="size-3 text-brand-soft" aria-hidden="true" />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
