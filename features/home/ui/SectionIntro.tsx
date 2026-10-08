import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Opening of a home section: a short label, the promise (h2) and one supporting line. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  lead,
  align = "center",
}: {
  /** The h2 id, referenced by the section's aria-labelledby. */
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <header
      className={cn(
        "flex max-w-2xl flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
      )}
    >
      <p data-reveal className="text-sm font-medium text-brand-soft">
        {eyebrow}
      </p>
      <h2
        id={id}
        data-reveal-heading
        className="text-3xl leading-tight tracking-[-0.03em] sm:text-4xl"
      >
        {title}
      </h2>
      {lead ? (
        <p data-reveal className="text-base leading-relaxed text-pretty text-ink-muted sm:text-lg">
          {lead}
        </p>
      ) : null}
    </header>
  );
}
