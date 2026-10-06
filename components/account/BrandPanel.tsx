"use client";

import { Check } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { NavBrand } from "@/components/NavBar";

/**
 * Lado esquerdo das telas de acesso: o mascote (que reage ao formulário ao
 * lado) e o que o Nelcota faz. No celular vira uma faixa curta no topo.
 */
export function BrandPanel({ maxParticipants }: { maxParticipants: number }) {
  const perks = [
    `Até ${maxParticipants} pessoas por sala`,
    "Tela e áudio do sistema",
    "Link pronto para mandar",
  ];
  return (
    <aside className="relative flex items-center gap-4 overflow-hidden border-b border-line bg-surface-2 bg-[radial-gradient(circle_at_30%_25%,color-mix(in_oklch,var(--color-brand)_18%,transparent),transparent_60%)] px-4 py-4 sm:px-8 lg:flex-col lg:items-start lg:justify-between lg:border-r lg:border-b-0 lg:px-12 lg:py-10">
      <NavBrand href="/" className="max-lg:hidden" />
      <Mascot
        className="size-20 sm:size-24 lg:size-60 lg:self-center"
        sizes="(min-width: 1024px) 720px, 288px"
      />
      <div className="flex min-w-0 flex-col gap-1 lg:gap-4">
        {/* No celular, a marca fica aqui na faixa (no computador, no topo do painel). */}
        <NavBrand href="/" className="-ml-2 self-start lg:hidden" />
        <p className="text-base font-semibold text-balance sm:text-lg lg:text-3xl lg:leading-tight lg:font-bold lg:tracking-tight">
          Compartilhe a tela em segundos, sem instalar nada.
        </p>
        <ul className="flex flex-col gap-2.5 text-ink-muted max-lg:hidden">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5">
              <span className="grid size-6 place-items-center rounded-full bg-brand/20">
                <Check className="size-3.5 text-brand-soft" aria-hidden="true" />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
