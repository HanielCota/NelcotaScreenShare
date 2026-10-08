import { Check, Minus } from "lucide-react";
import { BROWSER_ROWS, visitorRow } from "@/features/home/domain/browser-matrix";
import { useShareSupport } from "@/features/room/hooks/use-share-support";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { cn } from "@/lib/utils";
import { SectionIntro } from "./SectionIntro";

function Capability({ on, label }: { on: boolean; label: string }) {
  const Icon = on ? Check : Minus;
  return (
    <td className="px-3 py-3.5 text-center">
      <Icon
        className={cn("mx-auto size-4", on ? "text-success" : "text-ink-subtle")}
        aria-hidden="true"
      />
      <span className="sr-only">{on ? `${label}: sim` : `${label}: não`}</span>
    </td>
  );
}

/** "Will it work here?": the visitor's own browser, then what each browser does in the room. */
export function BrowserCheckSection() {
  const current = visitorRow(useShareSupport());

  return (
    <section aria-labelledby="browsers-title" className="w-full max-w-3xl">
      <SectionIntro id="browsers-title" title="Funciona no seu navegador?" />

      <div data-reveal className="mt-10 flex justify-center">
        <ShareSupportNote className="rounded-2xl border border-brand/30 bg-brand/8 px-4 py-3" />
      </div>

      <div
        data-reveal
        className="mt-8 overflow-x-auto rounded-3xl border border-line bg-surface/60"
      >
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">O que cada navegador faz na sala</caption>
          <thead>
            <tr className="border-b border-line text-xs text-ink-subtle">
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Navegador
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Tela
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Som do computador
              </th>
              <th scope="col" className="px-5 py-3 text-left font-medium max-sm:hidden">
                Na prática
              </th>
            </tr>
          </thead>
          <tbody>
            {BROWSER_ROWS.map((row) => (
              <tr
                key={row.id}
                aria-current={row.id === current || undefined}
                className="border-b border-line last:border-0 aria-[current]:bg-brand/10"
              >
                <th scope="row" className="px-5 py-3.5 text-left font-medium">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {row.name}
                    {row.id === current ? (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] text-brand-ink">
                        Você está aqui
                      </span>
                    ) : null}
                  </span>
                </th>
                <Capability on={row.screen} label="Compartilha a tela" />
                <Capability on={row.audio} label="Som do computador" />
                <td className="px-5 py-3.5 text-ink-muted max-sm:hidden">{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p data-reveal className="mt-4 text-center text-xs text-ink-subtle">
        Em qualquer um deles você assiste, fala e usa o chat.
      </p>
    </section>
  );
}
