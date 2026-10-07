import { Loader2, MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { canShareScreen } from "@/features/room/domain/share-support";
import type { ScreenShareControl } from "@/features/room/hooks/use-screen-share";
import { InviteCard } from "./InviteCard";

/** Ações disponíveis enquanto a pessoa está sozinha na sala. */
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
        <h1 id="alone-title" className="text-3xl font-medium tracking-tight text-balance">
          Você é a primeira pessoa aqui
        </h1>
        <p className="text-lg text-pretty text-ink-muted">
          {shareSupported
            ? "Mostre sua tela ou chame o time para entrar."
            : "Chame o time para entrar. Para mostrar sua tela, use o Chrome, Edge ou Firefox no computador."}
        </p>
      </div>
      {shareSupported ? (
        <div className="apple-buttons">
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
        </div>
      ) : null}
      <InviteCard code={code} />
    </section>
  );
}
