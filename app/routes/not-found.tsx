import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { Mascot } from "@/features/mascot/ui/Mascot";

export const meta = () => [{ title: "Página não encontrada · Nelcota" }];
export const loader = () => new Response(null, { status: 404 });

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ParticipantHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <Mascot className="size-32" sizes="384px" expression="worried" canSleep={false} />
        <p className="text-sm font-medium text-ink-subtle tabular-nums">Erro 404</p>
        <h1 className="text-[clamp(2.25rem,6vw,4rem)] leading-[1] tracking-[-0.045em]">
          Essa página sumiu.
          <span className="block text-ink-subtle">Ou nunca existiu.</span>
        </h1>
        <p className="max-w-md text-lg text-pretty text-ink-muted">
          Confira o endereço. Se alguém te mandou um link de sala, peça o link de novo.
        </p>
        <Button asChild size="lg">
          <Link viewTransition to="/">
            <ArrowLeft aria-hidden="true" />
            Voltar ao início
          </Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
