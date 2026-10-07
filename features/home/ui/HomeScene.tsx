import { Keyboard, UserRound } from "lucide-react";
import Link from "next/link";
import { HowItWorks } from "@/components/HowItWorks";
import { NavBar, NavBrand, NavDivider, NavPopover, ShortcutsPanel } from "@/components/NavBar";
import { navItemClass } from "@/components/nav-item-class";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import type { RecentRoom } from "@/features/room/domain/recent-room";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { HomeEntrance } from "./HomeEntrance";
import { HomeStart } from "./HomeStart";
import { RecentRooms } from "./RecentRooms";

/** Página inicial (Server Component); só a barra de entrada e a animação rodam no navegador. */
export function HomeScene({
  invalidCode,
  account,
  notice,
  recentRooms,
}: {
  invalidCode: boolean;
  /** Participante logado (nome para a navbar), ou null. */
  account: { name: string } | null;
  notice?: string | undefined;
  /** Salas em que a pessoa já esteve (vazio sem conta). */
  recentRooms: RecentRoom[];
}) {
  return (
    <HomeEntrance className="apple-buttons flex min-h-dvh flex-col items-center px-4 pt-28 pb-8 sm:px-8">
      <header data-anim="nav" className="fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
        <NavBar aria-label="Principal" className="mx-auto max-w-5xl">
          <NavBrand href="/" />
          <NavDivider className="max-sm:hidden" />
          {/* No celular os passos estão na própria página (e a barra não cabe). */}
          <HowItWorks className="max-sm:hidden" />
          <NavPopover
            trigger={
              <>
                <Keyboard className="size-4" aria-hidden="true" />
                Atalhos
              </>
            }
            label="Atalhos"
            className="max-sm:hidden"
          >
            <ShortcutsPanel />
          </NavPopover>
          <ThemeToggle className="ml-auto" />
          <NavDivider />
          {account ? (
            <>
              <Link href="/conta" className={`${navItemClass} max-w-40`}>
                <UserRound className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate max-sm:sr-only">{account.name}</span>
                <span className="sr-only sm:hidden">Minha conta</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/entrar" className={navItemClass}>
                Entrar
              </Link>
              <Button asChild className="max-sm:hidden">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </NavBar>
      </header>

      <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
        {notice ? (
          <output className="mb-8 block w-full rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
            {notice}
          </output>
        ) : null}
        <h1
          data-anim="title"
          className="text-center text-4xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
        >
          Compartilhe sua tela em segundos.
        </h1>

        <div data-anim="card" className="mt-8 w-full will-change-transform sm:mt-10">
          <HomeStart invalidCode={invalidCode} />
        </div>

        <div data-anim="recent" className="mt-10 w-full">
          <RecentRooms rooms={recentRooms} />
        </div>
      </div>

      <footer className="mt-12 flex w-full max-w-2xl flex-col items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <ShareSupportNote variant="badge" />
        <nav
          aria-label="Rodapé"
          className="flex items-center gap-5 text-xs font-medium text-ink-muted"
        >
          <Link href="/privacidade" className="transition-colors hover:text-ink">
            Privacidade
          </Link>
          <span className="text-ink-subtle">© Nelcota</span>
        </nav>
      </footer>
    </HomeEntrance>
  );
}
