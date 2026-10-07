import { Link } from "react-router";
import { AppHeader } from "@/components/shell/AppHeader";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { HomeEntrance } from "./HomeEntrance";
import { HomeStart } from "./HomeStart";

/** Home page; the entry bar and the mascot have interactive behavior. */
export function HomeScene({
  invalidCode,
  account,
  notice,
}: {
  invalidCode: boolean;
  /** Signed-in participant (name and photo for the navbar), or null. */
  account: { name: string; image: string | null } | null;
  notice?: string | undefined;
}) {
  return (
    <HomeEntrance className="apple-buttons flex min-h-dvh flex-col items-center px-4 pt-28 pb-8 sm:px-8">
      <AppHeader account={account} data-anim="nav" className="fixed inset-x-0 top-0 z-30" />

      <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
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

        <div data-anim="card" className="mt-8 w-full will-change-transform sm:mt-10">
          <HomeStart invalidCode={invalidCode} />
        </div>
      </div>

      <footer className="mt-12 flex w-full max-w-2xl flex-col items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <ShareSupportNote variant="badge" />
        <nav
          aria-label="Rodapé"
          className="flex items-center gap-5 text-xs font-medium text-ink-muted"
        >
          <Link to="/privacidade" className="transition-colors hover:text-ink">
            Privacidade
          </Link>
          <span className="text-ink-subtle">© Nelcota</span>
        </nav>
      </footer>
    </HomeEntrance>
  );
}
