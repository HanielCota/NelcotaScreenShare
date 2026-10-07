import { cn } from "@/lib/utils";

const TONES = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-surface-3 text-ink-muted",
  live: "bg-danger/15 text-danger",
} as const;

export type BadgeTone = keyof typeof TONES;

/** Status badge for tables and details (color + text, never color alone). */
export function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {tone === "live" ? (
        <span className="size-1.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}
