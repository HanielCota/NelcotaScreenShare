"use client";

import { NavPopover } from "@/components/NavBar";

const STEPS = [
  "Crie uma sala e copie o link.",
  "Mande para o time: cada pessoa entra pelo navegador, sem instalar nada.",
  "Clique em compartilhar e escolha a tela inteira, uma janela ou uma aba.",
];

/** "Como funciona" da navbar (home e telas de acesso). */
export function HowItWorks({ className }: { className?: string }) {
  return (
    <NavPopover trigger="Como funciona" label="Como funciona" className={className}>
      <p className="text-sm font-semibold tracking-tight">Como funciona</p>
      <ol className="mt-3 flex flex-col gap-2.5">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-ink-muted">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-ink">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </NavPopover>
  );
}
