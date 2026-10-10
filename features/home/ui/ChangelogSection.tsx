import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import {
  CHANGE_LABELS,
  RELEASES,
  type ChangeKind,
  type Release,
} from "@/features/home/domain/changelog";
import { cn } from "@/lib/utils";
import { SectionIntro } from "./SectionIntro";

const KIND_TONES: Record<ChangeKind, string> = {
  new: "text-brand-soft",
  fix: "text-info",
  improvement: "text-ink-muted",
};

/** "8 de out." for the corner of a notification (the date is a calendar day, read in UTC). */
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** A mix for the stack: two new things, then a fix and an improvement, when there are some. */
function highlights(release: Release) {
  const changesOf = (kind: ChangeKind) => release.changes.filter((change) => change.kind === kind);
  return [
    ...changesOf("new").slice(0, 2),
    ...changesOf("fix").slice(0, 1),
    ...changesOf("improvement").slice(0, 1),
  ];
}

/**
 * The latest release as a stack of notifications, like the ones the system shows: the app's
 * icon, what kind of change, when, and the change itself. The rest waits in a collapsed group
 * at the bottom that opens the full history.
 */
export function ChangelogSection() {
  const [latest] = RELEASES;
  if (!latest) return null;
  const shown = highlights(latest);
  const hidden = latest.changes.length - shown.length;
  const when = shortDate.format(new Date(`${latest.date}T00:00:00Z`));

  return (
    <section
      id="novidades"
      aria-labelledby="changelog-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro
        id="changelog-title"
        title="Novidades."
        subtitle="O que mudou por aqui."
        align="center"
      />

      <div data-fx className="mx-auto mt-12 flex w-full max-w-lg flex-col gap-2.5 sm:mt-16">
        <p className="mb-1 px-1 text-sm text-ink-subtle">{latest.title}</p>
        <ul className="flex flex-col gap-2.5">
          {shown.map((change) => (
            <li
              key={change.text}
              className="flex gap-3 rounded-[1.4rem] border border-line bg-surface/80 p-3.5 shadow-soft backdrop-blur"
            >
              <img src="/icon.png" alt="" width={40} height={40} className="size-10 rounded-xl" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline gap-1.5 text-sm">
                  <span className="font-semibold">Nelcota</span>
                  <span className={cn("font-medium", KIND_TONES[change.kind])}>
                    · {CHANGE_LABELS[change.kind]}
                  </span>
                  <time dateTime={latest.date} className="ml-auto text-xs text-ink-subtle">
                    {when}
                  </time>
                </span>
                <span className="text-sm leading-snug text-pretty">{change.text}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* The rest, collapsed like a notification group: two edges peeking under a card. */}
        <Link
          viewTransition
          to="/novidades"
          className="group relative mt-1 block pb-3 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-6 rounded-b-[1.2rem] border border-t-0 border-line bg-surface/50 transition-transform duration-(--motion-surface) ease-out-smooth group-hover:translate-y-1.5 motion-reduce:transition-none"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-3 bottom-1.5 h-6 rounded-b-[1.3rem] border border-t-0 border-line bg-surface/70 transition-transform duration-(--motion-surface) ease-out-smooth group-hover:translate-y-0.5 motion-reduce:transition-none"
          />
          <span className="relative flex items-center justify-between gap-3 rounded-[1.4rem] border border-line bg-surface p-3.5 text-sm font-medium shadow-soft transition-colors group-hover:border-brand/50 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
            {hidden > 0 ? `Mais ${hidden} mudanças e o histórico` : "Ver o histórico"}
            <ArrowRight className="icon-nudge size-4 text-brand-soft" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}
