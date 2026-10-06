import { useId, type ReactNode } from "react";

export function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={
        tone === "danger"
          ? "flex flex-col gap-4 rounded-2xl border border-danger/40 bg-danger/5 p-6 sm:p-8"
          : "glass flex flex-col gap-4 rounded-2xl p-6 sm:p-8"
      }
    >
      <div>
        <h2 id={id} className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
