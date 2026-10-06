import { Mail, Video } from "lucide-react";
import Link from "next/link";
import type { AccessContext } from "@/lib/access-context";
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
    <nav
      aria-label="Entrar ou criar conta"
      className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          replace
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-center text-sm font-semibold text-ink-muted transition-colors hover:text-ink",
            tab.id === current && "bg-surface text-ink shadow-sm",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Para onde a pessoa vai depois de entrar: a sala do link (ou do convite). */
export function RoomContextNote({ context }: { context: AccessContext }) {
  if (context.kind !== "room") return null;
  const Icon = context.invited ? Mail : Video;
  return (
    <p className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/20">
        <Icon className="size-4 text-brand-soft" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-ink-muted">
        {context.invited ? "Você foi convidado para a sala" : "Você vai entrar na sala"}{" "}
        <strong className="font-mono font-semibold break-all text-ink">{context.code}</strong>
      </span>
    </p>
  );
}
