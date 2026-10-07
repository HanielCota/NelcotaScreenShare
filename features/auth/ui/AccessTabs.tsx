import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Abas "Entrar | Criar conta". São links (cada tela tem seu endereço), e o
 * destino de volta, com o convite, passa junto.
 */
export function AccessTabs({
  current,
  returnTo,
}: {
  current: "entrar" | "cadastro";
  returnTo: string;
}) {
  const back = `?voltar=${encodeURIComponent(returnTo)}`;
  const tabs = [
    { id: "entrar", label: "Entrar", href: `/entrar${back}` },
    { id: "cadastro", label: "Criar conta", href: `/cadastro${back}` },
  ] as const;
  return (
    <nav aria-label="Entrar ou criar conta" className="flex gap-6 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          replace
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink",
            tab.id === current && "border-brand text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
