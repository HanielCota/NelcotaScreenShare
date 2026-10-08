import { cn } from "@/lib/utils";
import {
  CHANGE_LABELS,
  formatReleaseDate,
  type ChangeKind,
  type Release,
} from "@/features/home/domain/changelog";

const KIND_CLASSES: Record<ChangeKind, string> = {
  new: "bg-brand/15 text-brand-soft",
  fix: "bg-info/12 text-info",
  improvement: "bg-surface-2 text-ink-muted",
};

/** One release: date, title and its changes, each tagged with what kind of change it is. */
export function ReleaseNotes({
  release,
  headingLevel = "h3",
}: {
  release: Release;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <time dateTime={release.date} className="text-sm text-ink-subtle">
          {formatReleaseDate(release.date)}
        </time>
        <Heading className="text-xl">{release.title}</Heading>
      </header>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {release.changes.map((change) => (
          <li key={change.text} className="flex items-start gap-4 py-4 text-base leading-relaxed">
            <span
              className={cn(
                "mt-0.5 w-20 shrink-0 rounded-full py-0.5 text-center text-xs font-medium",
                KIND_CLASSES[change.kind],
              )}
            >
              {CHANGE_LABELS[change.kind]}
            </span>
            <span className="min-w-0 text-pretty">{change.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
