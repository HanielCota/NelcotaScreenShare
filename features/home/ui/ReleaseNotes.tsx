import { cn } from "@/lib/utils";
import {
  CHANGE_LABELS,
  formatReleaseDate,
  type ChangeKind,
  type Release,
} from "@/features/home/domain/changelog";

const KIND_CLASSES: Record<ChangeKind, string> = {
  new: "text-brand-soft",
  fix: "text-info",
  improvement: "text-ink-subtle",
};

/** One release: date, title and its changes, each tagged with what kind of change it is. */
export function ReleaseNotes({
  release,
  limit,
  headingLevel = "h3",
}: {
  release: Release;
  /** Shows only the first changes (the home page preview). */
  limit?: number;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const changes = limit === undefined ? release.changes : release.changes.slice(0, limit);

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <time dateTime={release.date} className="text-sm text-ink-subtle">
          {formatReleaseDate(release.date)}
        </time>
        <Heading className="text-xl">{release.title}</Heading>
      </header>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {changes.map((change) => (
          <li key={change.text} data-fx="sweep" className="flex gap-4 py-3 text-sm leading-relaxed">
            <span className={cn("w-20 shrink-0 font-medium", KIND_CLASSES[change.kind])}>
              {CHANGE_LABELS[change.kind]}
            </span>
            <span className="min-w-0 text-pretty">{change.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
