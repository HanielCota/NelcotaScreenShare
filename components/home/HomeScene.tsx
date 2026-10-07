"use client";

import { Keyboard, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { HowItWorks } from "@/components/HowItWorks";
import { MascotPair } from "@/components/home/MascotPair";
import {
  NavBar,
  NavBrand,
  NavDivider,
  navItemClass,
  NavPopover,
  ShortcutsPanel,
} from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/gsap";
import type { RecentRoom } from "@/lib/recent-room";
import { ShareSupportNote } from "@/components/account/ShareSupportNote";
import { RecentRooms } from "./RecentRooms";
import { SmartBar } from "./SmartBar";

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
  const scope = useRef<HTMLElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from("[data-anim]", {
          y: 24,
          opacity: 0,
          duration: 0.9,
          stagger: 0.09,
          ease: "expo.out",
        });
      });

      mm.add(MOTION_QUERIES.reduced, () => {
        gsap.from("[data-anim]", { opacity: 0, duration: 0.3 });
      });
    },
    { scope },
  );

  // Mantém o conteúdo visível enquanto a rota carrega. O pending termina também ao voltar.
  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  return (
    <main
      ref={scope}
      className="apple-buttons flex min-h-dvh flex-col items-center px-4 pt-28 pb-8 sm:px-8"
    >
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
          <SmartBar
            invalidCode={invalidCode}
            pending={pending}
            onNavigate={navigate}
            mascot={<MascotPair pending={pending} />}
          />
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
    </main>
  );
}
