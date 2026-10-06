"use client";

import { Keyboard, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
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
import { JoinForm } from "./JoinForm";

const STEPS = [
  "Crie uma sala e copie o link.",
  "Mande para o time: cada pessoa entra pelo navegador, sem instalar nada.",
  "Clique em compartilhar e escolha a tela inteira, uma janela ou uma aba.",
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
        gsap.from("[data-anim]", { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 });
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
      className="flex min-h-dvh flex-col items-center justify-center px-4 pt-28 pb-16 sm:px-8"
    >
      <header data-anim="nav" className="fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
        <NavBar aria-label="Principal" className="mx-auto max-w-5xl">
          <NavBrand href="/" />
          <NavDivider />
          <NavPopover trigger="Como funciona" label="Como funciona">
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

      <div className="flex w-full max-w-md flex-col items-center text-center">
        {notice ? (
          <output className="mb-6 block w-full rounded-xl bg-surface-2 px-4 py-3 text-sm">
            {notice}
          </output>
        ) : null}
        <div data-anim="mascot" className="mb-6">
          <Mascot className="size-44 sm:size-52" />
        </div>

        <h1
          data-anim="title"
          className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl"
        >
          Mostre sua tela. Sem enrolação.
        </h1>

        <p data-anim="lead" className="mt-4 text-base text-ink-muted sm:text-lg">
          Crie uma sala, mande o link para o time e compartilhe a tela pelo navegador, sem instalar
          nada.
        </p>

        <div data-anim="card" className="mt-8 w-full will-change-transform">
          <JoinForm invalidCode={invalidCode} pending={pending} onNavigate={navigate} />
        </div>
      </div>
    </main>
  );
}
