import { Moon, Sun } from "lucide-react";
import { Hint } from "@/components/Hint";
import { useTheme } from "@/lib/hooks/use-theme";
import { switchTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { navItemClass } from "./nav-item-class";

/** Sun and moon: switches between dark and light theme and remembers the choice. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next: Theme = theme === "light" ? "dark" : "light";
  const label = theme === "light" ? "Ativar modo escuro" : "Ativar modo claro";

  return (
    <Hint text={label}>
      <button
        type="button"
        onClick={() => switchTheme(next)}
        aria-label={label}
        className={cn(navItemClass, "relative w-9 justify-center px-0", className)}
      >
        {/* Both icons stay in the DOM; the theme (data-theme) decides which one shows. */}
        <Sun
          aria-hidden="true"
          className="absolute size-4 scale-0 rotate-90 opacity-0 transition-all duration-300 ease-out-expo in-data-[theme=light]:scale-100 in-data-[theme=light]:rotate-0 in-data-[theme=light]:opacity-100 motion-reduce:transition-none"
        />
        <Moon
          aria-hidden="true"
          className="absolute size-4 scale-100 rotate-0 opacity-100 transition-all duration-300 ease-out-expo in-data-[theme=light]:scale-0 in-data-[theme=light]:-rotate-90 in-data-[theme=light]:opacity-0 motion-reduce:transition-none"
        />
      </button>
    </Hint>
  );
}
