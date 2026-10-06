"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Mascot } from "@/components/Mascot";
import { mascotLine } from "@/lib/access-copy";

/** Balão do mascote: a fala muda com a tela e com a sala de destino. */
function SpeechBubble() {
  const pathname = usePathname();
  const returnTo = useSearchParams().get("voltar");
  return <BubbleText text={mascotLine(pathname, returnTo)} />;
}

function BubbleText({ text }: { text: string }) {
  return (
    <p className="relative max-w-64 rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-snug lg:max-w-72 lg:text-base">
      {text}
      {/* Rabinho do balão: aponta para o mascote (à esquerda no celular, embaixo no computador). */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-line bg-surface lg:top-auto lg:-bottom-1.5 lg:left-10 lg:translate-y-0 lg:border-t-0 lg:border-r lg:border-b lg:border-l-0"
      />
    </p>
  );
}

/**
 * Lado do mascote no painel de acesso. Ele reage ao formulário ao lado e
 * fala pelo balão; embaixo, só a informação que ajuda de fato.
 */
export function BrandPanel() {
  return (
    <aside className="flex flex-col border-b border-line bg-surface-2 px-5 py-4 sm:px-8 lg:border-r lg:border-b-0 lg:p-10">
      {/* Mascote e balão juntos: lado a lado no celular, balão em cima no computador. */}
      <div className="flex items-center gap-3 lg:flex-1 lg:flex-col-reverse lg:items-start lg:justify-center lg:gap-1">
        <Mascot
          className="size-20 shrink-0 sm:size-24 lg:ml-6 lg:size-52"
          sizes="(min-width: 1024px) 624px, 288px"
        />
        <Suspense fallback={<BubbleText text="Oi! Eu sou o Nelcota." />}>
          <SpeechBubble />
        </Suspense>
      </div>
      <p className="max-w-72 text-xs leading-relaxed text-ink-subtle max-lg:hidden">
        Para compartilhar a tela, use o Chrome, o Edge ou o Firefox no computador. Não precisa
        instalar nada.
      </p>
    </aside>
  );
}
