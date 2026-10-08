import { Check, Compass, Flame, Globe, Minus, Smartphone, type LucideIcon } from "lucide-react";
import { BROWSER_ROWS, visitorRow, type BrowserRow } from "@/features/home/domain/browser-matrix";
import { useShareSupport } from "@/features/room/hooks/use-share-support";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { cn } from "@/lib/utils";
import { SectionIntro } from "./SectionIntro";

/** A plain glyph per family; no brand logos. */
const ICONS: Record<BrowserRow["id"], LucideIcon> = {
  chromium: Globe,
  firefox: Flame,
  safari: Compass,
  mobile: Smartphone,
};

function Capability({ on, label }: { on: boolean; label: string }) {
  const Icon = on ? Check : Minus;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className={on ? "" : "text-ink-subtle"}>{label}</span>
      <Icon
        className={cn("size-4 shrink-0", on ? "text-success" : "text-ink-subtle")}
        aria-hidden="true"
      />
      <span className="sr-only">{on ? "sim" : "não"}</span>
    </li>
  );
}

/**
 * "Will it work here?" as one card per browser family: what it shares, in a sentence and
 * two checks. The visitor's own browser lights up once the page knows it (after hydration).
 */
export function BrowserCheckSection() {
  const support = useShareSupport();
  const current = visitorRow(support);

  return (
    <section aria-labelledby="browsers-title" className="w-full max-w-5xl">
      <SectionIntro
        id="browsers-title"
        title="Funciona no seu navegador?"
        subtitle="Veja o que cada um faz."
      />

      <ul
        data-fx
        aria-label="O que cada navegador faz na sala"
        className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4"
      >
        {BROWSER_ROWS.map((row) => {
          const Icon = ICONS[row.id];
          const here = row.id === current;
          return (
            <li
              key={row.id}
              aria-current={here || undefined}
              className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 transition-colors aria-[current]:border-brand/50 aria-[current]:bg-brand/8"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink-muted">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                {here ? (
                  <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-brand-ink">
                    Você está aqui
                  </span>
                ) : null}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-lg leading-snug font-semibold tracking-[-0.02em]">
                  {row.name}
                </span>
                <span className="text-sm text-ink-muted">{row.summary}</span>
              </span>
              <ul className="mt-auto divide-y divide-line border-t border-line text-sm">
                <Capability on={row.screen} label="Compartilha a tela" />
                <Capability on={row.audio} label="Som do computador" />
              </ul>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-3 text-sm text-ink-muted">
        {/* A browser none of the cards describe still gets its own answer. */}
        {support !== null && current === null ? <ShareSupportNote /> : null}
        <p>Em qualquer um deles você assiste, fala e usa o chat.</p>
      </div>
    </section>
  );
}
