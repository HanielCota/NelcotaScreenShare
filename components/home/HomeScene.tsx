"use client";

import { Keyboard, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { HowItWorks } from "@/components/HowItWorks";
import { Mascot } from "@/components/Mascot";
import { celebrateMascot } from "@/components/mascot/events";
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
import { generateRoomCode, roomPath } from "@/lib/livekit";
import { ShareSupportNote } from "@/components/account/ShareSupportNote";
import { JoinForm } from "./JoinForm";

/** Os três passos, na mesma ordem do slogan (abriu, mandou, mostrou). */
const STEPS = [
  {
    title: "Abra uma sala.",
    text: "Um clique em “Criar sala” e ela está no ar, com um código só dela.",
  },
  {
    title: "Mande o link.",
    text: "Cada pessoa entra pelo navegador, no computador ou no celular.",
  },
  {
    title: "Mostre a tela.",
    text: "Tela inteira, uma janela ou uma aba. Com som, no Chrome e no Edge.",
  },
];

export function HomeScene({
  invalidCode,
  account,
  notice,
}: {
  invalidCode: boolean;
  /** Participante logado (nome para a navbar), ou null. */
  account: { name: string } | null;
  notice?: string | undefined;
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

  function createRoom() {
    if (pending) return;
    celebrateMascot();
    navigate(roomPath(generateRoomCode()));
  }

  return (
    <main
      ref={scope}
      className="apple-buttons flex min-h-dvh flex-col items-center px-4 pt-32 pb-10 sm:px-8 sm:pt-40"
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
              {/* No celular o "Criar sala" do formulário já fica logo abaixo. */}
              <Button
                disabled={pending}
                onClick={createRoom}
                className="h-9 rounded-xl px-3.5 max-sm:hidden"
              >
                <Plus aria-hidden="true" />
                Criar sala
              </Button>
            </>
          ) : (
            <>
              <Link href="/entrar" className={navItemClass}>
                Entrar
              </Link>
              <Button asChild className="h-9 rounded-xl px-3.5 max-sm:hidden">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </NavBar>
      </header>

      <section
        aria-labelledby="home-title"
        className="flex w-full max-w-3xl flex-col items-center text-center"
      >
        {notice ? (
          <output className="mb-8 block w-full max-w-md rounded-2xl bg-surface-2 px-4 py-3 text-sm">
            {notice}
          </output>
        ) : null}
        <p data-anim="eyebrow" className="text-base font-semibold text-brand-soft sm:text-lg">
          Nelcota
        </p>
        <h1
          id="home-title"
          data-anim="title"
          className="mt-2 text-5xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-7xl lg:text-8xl"
        >
          Abriu. Mandou. Mostrou.
        </h1>
        <p
          data-anim="lead"
          className="mt-5 max-w-2xl text-lg leading-snug text-ink-muted sm:text-2xl"
        >
          Uma sala, um link e a sua tela na frente do time em segundos. Direto do navegador, sem
          instalar nada.
        </p>

        <div data-anim="card" className="mt-9 w-full will-change-transform">
          <JoinForm invalidCode={invalidCode} pending={pending} onNavigate={navigate} />
        </div>

        <div data-anim="mascot" className="mt-10">
          <Mascot className="size-48 sm:size-60" />
        </div>
        <ShareSupportNote className="mt-2 justify-center text-left" />
      </section>

      <section
        aria-labelledby="home-steps"
        className="mt-28 w-full max-w-5xl border-t border-line pt-14 sm:mt-36"
      >
        <h2 id="home-steps" className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Três passos. Nenhuma instalação.
        </h2>
        <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-subtle tabular-nums">
                0{index + 1}
              </span>
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{step.title}</h3>
              <p className="text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-24 flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-subtle">
        <span>Nelcota · compartilhamento de tela pelo navegador</span>
        <Link href="/privacidade" className="hover:text-ink">
          Privacidade
        </Link>
      </footer>
    </main>
  );
}
