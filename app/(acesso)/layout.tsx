import type { ReactNode } from "react";
import { BrandPanel } from "@/components/account/BrandPanel";
import { ShareSupportNote } from "@/components/account/ShareSupportNote";
import Link from "next/link";
import { HowItWorks } from "@/components/HowItWorks";
import { navItemClass } from "@/components/nav-item-class";
import { NavBar, NavBrand, NavDivider } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/**
 * Telas de acesso da conta de participante: um painel no centro da página,
 * com o mascote de um lado (faixa no topo, no celular) e o formulário do
 * outro. Dentro do painel o AuthCard não desenha cartão próprio
 * (`data-layout="split"`).
 */
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="apple-buttons flex min-h-dvh flex-col">
      {/* Mesma navbar da home; "Entrar | Criar conta" ficam nas abas do formulário. */}
      <header className="px-4 pt-4 sm:px-6">
        <NavBar aria-label="Principal" className="mx-auto max-w-5xl">
          <NavBrand href="/" />
          <NavDivider />
          <HowItWorks />
          <Link href="/privacidade" className={cn(navItemClass, "max-sm:hidden")}>
            Privacidade
          </Link>
          <ThemeToggle className="ml-auto" />
        </NavBar>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-8 sm:px-6 lg:justify-center lg:py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-[34rem] lg:grid-cols-[5fr_6fr]">
          <BrandPanel />
          <div
            data-layout="split"
            className="group/access flex flex-col items-center justify-center px-5 py-7 sm:px-10 sm:py-10"
          >
            {children}
            {/* No celular o aviso vem depois do formulário (no computador, no lado do mascote). */}
            <ShareSupportNote className="mt-8 w-full max-w-sm border-t border-line pt-5 lg:hidden" />
          </div>
        </div>
      </main>
    </div>
  );
}
