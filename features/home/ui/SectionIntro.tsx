import { cn } from "@/lib/utils";

/**
 * Opening of a reference section, in the scenes' type: a large title and, when there is one,
 * a second line in a quieter tone. Centered over centered or symmetric content; left-aligned
 * when the content reads from the left (a side column, alternating rows).
 */
export function SectionIntro({
  id,
  title,
  subtitle,
  align = "start",
}: {
  /** The h2 id, referenced by the section's aria-labelledby. */
  id: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
}) {
  return (
    <h2
      id={id}
      data-fx
      className={cn(
        "text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance",
        align === "center" && "text-center",
      )}
    >
      {title}
      {subtitle ? <span className="block text-ink-subtle">{subtitle}</span> : null}
    </h2>
  );
}
