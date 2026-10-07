import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap";
import { cn } from "@/lib/utils";

type DockTone = "default" | "active" | "danger" | "muted";

const toneClasses: Record<DockTone, string> = {
  default: "border-line-strong bg-surface-2 text-ink group-hover:bg-surface-3",
  active: "border-brand bg-brand text-brand-ink group-hover:bg-brand-hover",
  // Sair: sólido, para não se confundir com "Mudo" (vermelho translúcido).
  danger: "border-danger bg-danger text-canvas group-hover:bg-danger/90",
  muted: "border-danger/25 bg-danger/15 text-danger group-hover:bg-danger/25",
};

const captionClasses: Record<DockTone, string> = {
  default: "text-ink/85 group-hover:text-ink",
  active: "text-ink",
  // O botão vermelho já diz "sair"; o texto neutro não pesa no dock.
  danger: "text-ink/85 group-hover:text-ink",
  muted: "text-danger",
};

interface DockButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  label: string;
  tone?: DockTone;
  pressed?: boolean;
  busy?: boolean;
  /** Tecla de atalho, mostrada no tooltip (ex.: "M"). */
  shortcut?: string;
  /** Nome visível embaixo do ícone (leigo não adivinha ícone; celular não tem tooltip). */
  caption?: string;
  /** Versão curta do nome para o celular (ex.: "Tela" em vez de "Compartilhar"). */
  shortCaption?: string;
  /** Ajuste da superfície do ícone para controles agrupados. */
  iconClassName?: string;
}

/**
 * Botão do dock: superfície com ícone e nome embaixo.
 * Tooltip com o atalho e microinterações via GSAP. Repassa props e
 * ref ao <button>, então serve de gatilho de primitivos Radix
 * (`<Popover.Trigger asChild>`). Para indisponível, use `aria-disabled`: com
 * `disabled` o tooltip não abre.
 */
export function DockButton({
  label,
  tone = "default",
  pressed,
  busy = false,
  shortcut,
  caption,
  shortCaption,
  iconClassName,
  className,
  children,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  ...props
}: DockButtonProps) {
  const { contextSafe } = useGSAP();

  // Só a superfície do ícone reage (não o botão inteiro): no controle do
  // microfone, que tem duas metades, nada se descola do grupo.
  const animate = contextSafe((button: HTMLElement, vars: gsap.TweenVars) => {
    const surface = button.querySelector<HTMLElement>("[data-dock-surface]");
    if (
      !surface ||
      prefersReducedMotion() ||
      button.matches(":disabled") ||
      button.getAttribute("aria-disabled") === "true"
    )
      return;
    gsap.to(surface, { duration: 0.25, ease: "power3.out", overwrite: "auto", ...vars });
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-anim="dock-item"
          aria-label={label}
          aria-pressed={pressed}
          aria-busy={busy || undefined}
          aria-keyshortcuts={shortcut}
          {...props}
          onPointerLeave={(e) => {
            onPointerLeave?.(e);
            animate(e.currentTarget, { scale: 1 });
          }}
          onPointerDown={(e) => {
            onPointerDown?.(e);
            animate(e.currentTarget, { scale: 0.92, duration: 0.1 });
          }}
          onPointerUp={(e) => {
            onPointerUp?.(e);
            animate(e.currentTarget, { scale: 1, ease: "back.out(3)", duration: 0.35 });
          }}
          className={cn(
            "group flex shrink-0 touch-manipulation flex-col items-center gap-2 rounded-xl outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
            caption ? "min-w-11 sm:min-w-16" : "",
            className,
          )}
        >
          <span
            data-dock-surface=""
            className={cn(
              "relative grid size-11 place-items-center rounded-xl border transition-colors duration-150 group-focus-visible:ring-3 group-focus-visible:ring-brand/60 sm:size-12",
              toneClasses[tone],
              iconClassName,
            )}
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : children}
          </span>
          {caption ? (
            <span
              aria-hidden="true"
              className={cn(
                "text-xs leading-4 font-medium whitespace-nowrap sm:text-[0.8125rem]",
                captionClasses[tone],
              )}
            >
              {shortCaption ? (
                <>
                  <span className="sm:hidden">{shortCaption}</span>
                  <span className="max-sm:hidden">{caption}</span>
                </>
              ) : (
                caption
              )}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={10}>
        {label}
        {shortcut ? (
          <kbd
            data-slot="kbd"
            className="bg-background/15 px-1.5 py-0.5 font-sans text-[0.7rem] font-medium"
          >
            {shortcut}
          </kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
