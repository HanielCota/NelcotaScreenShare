"use client";

import { Loader2, MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { canShareScreen } from "@/features/room/domain/share-support";
import type { ScreenShareControl } from "@/features/room/hooks/use-screen-share";
import { InviteLinkButton } from "@/features/room/ui/prejoin/InviteLinkButton";

/**
 * Sozinho na sala: em vez de um bloco vazio, as duas coisas que importam
 * agora (mostrar a tela e chamar o time), grandes e com nome.
 */
export function AloneWelcome({ code, share }: { code: string; share: ScreenShareControl }) {
  const shareSupported = canShareScreen();

  return (
    <section
      data-flip-id="alone"
      aria-labelledby="alone-title"
      className="flex max-w-lg flex-col items-center gap-5 text-center"
    >
      <Mascot className="size-28" sizes="336px" canSleep={false} />
      <div className="flex flex-col gap-2">
        <h1 id="alone-title" className="text-3xl font-semibold tracking-tight text-balance">
          Você é a primeira pessoa aqui
        </h1>
        <p className="text-lg text-pretty text-ink-muted">
          {shareSupported
            ? "Mostre sua tela agora ou chame o time para entrar."
            : "Chame o time para entrar. Para mostrar sua tela, use o Chrome, Edge ou Firefox no computador."}
        </p>
      </div>
      <div className="apple-buttons flex flex-wrap items-center justify-center gap-3">
        {shareSupported ? (
          <Button
            size="lg"
            disabled={share.busy}
            onClick={() => void share.start({ surface: "monitor", audio: true })}
          >
            {share.busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <MonitorUp aria-hidden="true" />
            )}
            Compartilhar minha tela
          </Button>
        ) : null}
        <InviteLinkButton code={code} />
      </div>
    </section>
  );
}
