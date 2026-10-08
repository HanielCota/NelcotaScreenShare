import { Check } from "lucide-react";
import { Link } from "react-router";
import { AppHeader } from "@/components/shell/AppHeader";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { HomeEntrance } from "./HomeEntrance";
import { HomeSections } from "./HomeSections";
import { HomeStart } from "./HomeStart";

const FOOTER_LINK = "transition-colors hover:text-ink";

const HERO_FACTS = ["Grátis para começar", "Sem instalar nada", "Nada é gravado"];

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

      {/* Only as tall as its content: the product demo starts right below the fold line. */}
      <div className="flex w-full max-w-2xl flex-col items-center pt-32 pb-16 sm:pt-40 sm:pb-20">
        {notice ? (
          <output className="mb-8 block w-full rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
            {notice}
          </output>
        ) : null}
        <h1
          data-anim="title"
          className="text-center text-4xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-5xl"
        >
          Mostre a tela com <span className="text-brand-soft">som e ponteiro</span>.
        </h1>
        <p
          data-anim="subtitle"
          className="mt-4 max-w-lg text-center text-base leading-relaxed text-pretty text-ink-muted sm:text-lg"
        >
          Para times de tecnologia mostrarem um bug, revisarem uma tela ou parearem num problema.
          Direto do navegador, e quem recebe o link entra sem criar conta.
        </p>

        <div data-anim="card" className="mt-8 w-full will-change-transform sm:mt-10">
          <HomeStart invalidCode={invalidCode} signedIn={account !== null} />
        </div>
        <ul
          data-anim="subtitle"
          aria-label="Destaques"
          className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-muted"
        >
          {HERO_FACTS.map((fact) => (
            <li key={fact} className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-brand-soft" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      </div>

      <HomeSections maxParticipants={maxParticipants} signedIn={account !== null} />

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
          <Link viewTransition to="/novidades" className={FOOTER_LINK}>
            Novidades
          </Link>
          <Link viewTransition to="/privacidade" className={FOOTER_LINK}>
            Privacidade
          </Link>
          <span className="text-ink-subtle">© Nelcota</span>
        </nav>
      </footer>
    </HomeEntrance>
  );
}
