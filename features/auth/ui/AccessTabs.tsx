import { Link } from "react-router";
import { cn } from "@/lib/utils";

/**
 * "Entrar | Criar conta" tabs. They are links (each screen has its own address),
 * and the return destination, with the invite, is carried along.
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
          viewTransition
          key={tab.id}
          to={tab.href}
          replace
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink",
            tab.id === current && "border-brand text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
