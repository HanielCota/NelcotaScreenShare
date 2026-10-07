import { Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";
import { switchTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: LucideIcon; selectedClass: string }[] = [
  {
    value: "dark",
    label: "Escuro",
    icon: Moon,
    selectedClass: "in-data-[theme=dark]:bg-surface-3 in-data-[theme=dark]:text-ink",
  },
  {
    value: "light",
    label: "Claro",
    icon: Sun,
    selectedClass: "in-data-[theme=light]:bg-surface-3 in-data-[theme=light]:text-ink",
  },
];

/**
 * Explicit theme choice (Escuro | Claro), remembered like the header toggle. The
 * highlight follows `data-theme` through CSS, so it is right before hydration too.
 */
export function ThemeChoice({ className }: { className?: string }) {
  const theme = useTheme();
  return (
    <fieldset className={cn("flex items-center justify-center gap-3 text-sm", className)}>
      <legend className="float-left text-ink-muted">Tema</legend>
      <div className="inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {OPTIONS.map(({ value, label, icon: Icon, selectedClass }) => (
          <label
            key={value}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 font-medium text-ink-muted transition-colors hover:text-ink has-focus-visible:ring-3 has-focus-visible:ring-brand/60",
              selectedClass,
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => switchTheme(value)}
              className="sr-only"
            />
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
