"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { Mascot } from "@/components/Mascot";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/gsap";
import { JoinForm } from "./JoinForm";

export function HomeScene({ invalidCode }: { invalidCode: boolean }) {
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

  return (
    <main
      ref={scope}
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 sm:px-8"
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
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
