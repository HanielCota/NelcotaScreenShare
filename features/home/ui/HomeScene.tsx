import { Link } from "react-router";
import { AppHeader } from "@/components/shell/AppHeader";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { HomeEntrance } from "./HomeEntrance";
import { HomeSections } from "./HomeSections";
import { HomeStart } from "./HomeStart";

const FOOTER_LINK = "transition-colors hover:text-ink";

/** Home page: the hero with the entry bar and the mascots, then the sections that sell it. */
export function HomeScene({
  invalidCode,
  account,
  notice,
  maxParticipants,
}: {
  invalidCode: boolean;
  /** Signed-in participant (name and photo for the navbar), or null. */
  account: { name: string; image: string | null } | null;
  notice?: string | undefined;
  /** Room size configured on the server, quoted by the sections. */
  maxParticipants: number;
}) {
  return (
    <HomeEntrance className="flex flex-col items-center px-4 pb-8 sm:px-8">
      <AppHeader account={account} data-anim="nav" className="fixed inset-x-0 top-0 z-30" />

      {/* Slightly shorter than the viewport: the demo peeks in and invites the scroll. */}
      <div className="flex min-h-[92svh] w-full max-w-2xl flex-col items-center justify-center pt-28 pb-16">
        {notice ? (
          <output className="mb-8 block w-full rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
            {notice}
          </output>
        ) : null}
        <h1
          data-anim="title"
          className="text-center text-4xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-5xl"
        >
          Compartilhe sua tela em segundos.
        </h1>
        <p
          data-anim="subtitle"
          className="mt-4 max-w-lg text-center text-base leading-relaxed text-pretty text-ink-muted sm:text-lg"
        >
          Direto do navegador, com o som do computador junto. Quem recebe o link entra e já vê o que
          você está mostrando.
        </p>

        <div data-anim="card" className="mt-8 w-full will-change-transform sm:mt-10">
          <HomeStart invalidCode={invalidCode} />
        </div>
      </div>

      <HomeSections maxParticipants={maxParticipants} />

      <footer className="mt-24 flex w-full max-w-5xl flex-col items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <ShareSupportNote variant="badge" />
        <nav
          aria-label="Rodapé"
          className="flex items-center gap-5 text-xs font-medium text-ink-muted"
        >
          <a href="#como-funciona" className={FOOTER_LINK}>
            Como funciona
          </a>
          <a href="#recursos" className={FOOTER_LINK}>
            Recursos
          </a>
          <Link viewTransition to="/privacidade" className={FOOTER_LINK}>
            Privacidade
          </Link>
          <span className="text-ink-subtle">© Nelcota</span>
        </nav>
      </footer>
    </HomeEntrance>
  );
}
