import { Outlet } from "react-router";
import { BrandPanel } from "@/features/auth/ui/BrandPanel";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";

/**
 * Telas de acesso da conta de participante: um painel no centro da página,
 * com o mascote de um lado (faixa no topo, no celular) e o formulário do
 * outro. Dentro do painel o AuthCard não desenha cartão próprio
 * (`data-layout="split"`).
 */
export default function AccessLayout() {
  const children = <Outlet />;
  return (
    <div className="apple-buttons flex min-h-dvh flex-col">
      <ParticipantHeader showAuthLinks={false} />
      <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-8 sm:px-6 lg:justify-center lg:py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-[34rem] lg:grid-cols-[5fr_6fr]">
          <BrandPanel />
          <div
            data-layout="split"
            className="group/access flex flex-col items-center justify-center px-5 py-7 sm:px-10 sm:py-10"
          >
            {children}
            {/* No celular o aviso vem depois do formulário (no computador, no lado do mascote). */}
            <ShareSupportNote className="mt-8 w-full max-w-sm border-t border-line pt-5 lg:hidden" />
          </div>
        </div>
      </main>
    </div>
  );
}
