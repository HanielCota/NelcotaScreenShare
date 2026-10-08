/**
 * Opening of a reference section, in the scenes' type: a large left-aligned title and, when
 * there is one, a second line in a quieter tone.
 */
export function SectionIntro({
  id,
  title,
  subtitle,
}: {
  /** The h2 id, referenced by the section's aria-labelledby. */
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <h2
      id={id}
      data-fx="title"
      className="max-w-4xl text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance"
    >
      {title}
      {subtitle ? (
        <span data-fx-sub className="block text-ink-subtle">
          {subtitle}
        </span>
      ) : null}
    </h2>
  );
}
