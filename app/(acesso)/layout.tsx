import type { ReactNode } from "react";
import { BrandPanel } from "@/components/account/BrandPanel";
import { NavBrand } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Telas de acesso da conta de participante: um painel no centro da página,
 * com o mascote de um lado (faixa no topo, no celular) e o formulário do
 * outro. Dentro do painel o AuthCard não desenha cartão próprio
 * (`data-layout="split"`).
 */
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <NavBrand href="/" />
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-[34rem] lg:grid-cols-[5fr_6fr]">
        <BrandPanel />
        <div
          data-layout="split"
          className="group/access flex flex-col items-center justify-center px-5 py-7 sm:px-10 sm:py-10"
        >
          {children}
        </div>
      </div>
    </main>
  );
}
