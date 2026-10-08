import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { formatReleaseDate, RELEASES } from "@/features/home/domain/changelog";
import { ReleaseNotes } from "./ReleaseNotes";
import { SectionIntro } from "./SectionIntro";

const PREVIEW_CHANGES = 5;

/**
 * The latest release, so visitors see the app keeps moving: its date and title on the left,
 * its first changes on the right, and the full history one click away.
 */
export function ChangelogSection() {
  const [latest] = RELEASES;
  if (!latest) return null;
  const hidden = latest.changes.length - PREVIEW_CHANGES;

  return (
    <section
      id="novidades"
      aria-labelledby="changelog-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro id="changelog-title" title="Novidades." subtitle="O que mudou por aqui." />

      <div className="mt-12 grid gap-8 sm:mt-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
        <div className="flex flex-col gap-3 md:sticky md:top-28 md:self-start">
          <time dateTime={latest.date} className="text-sm text-ink-subtle">
            {formatReleaseDate(latest.date)}
          </time>
          <h3 className="text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-3xl">
            {latest.title}
          </h3>
          <Link
            viewTransition
            to="/novidades"
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-soft underline-offset-4 hover:underline"
          >
            {hidden > 0 ? `Ver mais ${hidden} mudanças e o histórico` : "Ver o histórico"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ReleaseNotes release={latest} limit={PREVIEW_CHANGES} header={false} />
      </div>
    </section>
  );
}
