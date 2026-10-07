import { Suspense } from "react";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { BubbleText } from "./BubbleText";
import { SpeechBubble } from "./SpeechBubble";

/**
 * Lado do mascote no painel de acesso. Ele reage ao formulário ao lado e
 * fala pelo balão; embaixo, o que o navegador de quem está vendo consegue
 * fazer na sala.
 */
export function BrandPanel() {
  return (
    <aside className="flex flex-col border-b border-line bg-surface-2 px-5 py-4 sm:px-8 lg:border-r lg:border-b-0 lg:p-10">
      {/* Mascote e balão juntos: lado a lado no celular, balão em cima no computador. */}
      <div className="flex items-center gap-3 lg:flex-1 lg:flex-col-reverse lg:items-start lg:justify-center lg:gap-1">
        <Mascot
          facing="right"
          className="size-20 shrink-0 sm:size-24 lg:ml-6 lg:size-52"
          sizes="(min-width: 1024px) 624px, 288px"
        />
        <Suspense fallback={<BubbleText text="Oi! Eu sou o Nelcota." />}>
          <SpeechBubble />
        </Suspense>
      </div>
      <ShareSupportNote className="max-w-80 max-lg:hidden" />
    </aside>
  );
}
