import { Check } from "lucide-react";
import { useRef } from "react";
import { useHeroRecede } from "@/features/home/hooks/use-hero-recede";
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
  const hero = useRef<HTMLDivElement>(null);
  useHeroRecede(hero);

  return (
    <HomeEntrance className="flex flex-col items-center pb-8">
      <AppHeader account={account} data-anim="nav" className="fixed inset-x-0 top-0 z-30" />

      {/* Almost a full screen: the dark stage peeks in below, inviting the scroll. As the story
          starts, the hero steps back (see useHeroRecede). */}
      <div
        ref={hero}
        className="flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col items-center justify-center px-4 pt-28 pb-12 sm:px-8"
      >
        {notice ? (
          <output className="mb-8 block w-full rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
            {notice}
          </output>
        ) : null}
        <h1
          data-anim="title"
          className="text-center text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-balance"
        >
          <span data-hero-line className="block">
            Mostre a tela.
          </span>
          <span data-hero-line className="block text-brand-soft">
            Com som e ponteiro.
          </span>
        </h1>
        <p
          data-anim="subtitle"
          className="mt-6 max-w-xl text-center text-lg leading-relaxed text-pretty text-ink-muted sm:text-xl"
        >
          Para times de tecnologia mostrarem um bug, revisarem uma tela ou parearem num problema.
          Direto do navegador, e quem recebe o link entra sem criar conta.
        </p>

        <div data-anim="card" className="mt-10 w-full max-w-2xl will-change-transform sm:mt-12">
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

      <footer className="mx-4 mt-24 flex w-[calc(100%-2rem)] max-w-5xl flex-col items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
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
