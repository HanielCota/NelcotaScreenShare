import type { ReactNode } from "react";
import { BrandPanel } from "@/components/account/BrandPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getEnv } from "@/server/env";

/**
 * Telas de acesso da conta de participante: mascote à esquerda (faixa no
 * topo, no celular) e formulário à direita, sem cartão
 * (`data-layout="split"` muda o AuthCard).
 */
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <BrandPanel maxParticipants={getEnv().MAX_PARTICIPANTS} />
      <main className="flex flex-col px-4 py-6 sm:px-8 lg:py-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div
          data-layout="split"
          className="group/access flex flex-1 flex-col items-center pt-2 pb-8 lg:justify-center lg:py-8"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
