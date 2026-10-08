/** Opening of a home section: a plain title (h2), centered above the content. */
export function SectionIntro({
  id,
  title,
}: {
  /** The h2 id, referenced by the section's aria-labelledby. */
  id: string;
  title: string;
}) {
  return (
    <h2
      id={id}
      className="mx-auto max-w-2xl text-center text-3xl leading-tight tracking-[-0.03em] sm:text-4xl"
    >
      {title}
    </h2>
  );
}
