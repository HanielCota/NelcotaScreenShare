"use client";

import type { ComponentProps } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type DockTone = "default" | "active" | "primary" | "danger" | "muted";

const toneClasses: Record<DockTone, string> = {
  default: "bg-surface-2 text-ink group-hover:bg-surface-3",
  active: "bg-brand text-brand-ink group-hover:bg-brand-hover",
  // Ação principal da sala (compartilhar): verde mesmo sem estar ativa.
  primary: "bg-brand text-brand-ink group-hover:bg-brand-hover",
  danger: "bg-danger text-canvas group-hover:bg-danger/90",
  muted: "bg-danger/15 text-danger group-hover:bg-danger/25",
};

const captionClasses: Record<DockTone, string> = {
  default: "text-ink-muted",
  active: "text-ink",
  primary: "text-ink",
  danger: "text-danger",
  muted: "text-danger",
};

interface DockButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  label: string;
  tone?: DockTone;
  pressed?: boolean;
  /** Tecla de atalho, mostrada no tooltip (ex.: "M"). */
  shortcut?: string;
  /** Nome visível embaixo do ícone (leigo não adivinha ícone; celular não tem tooltip). */
  caption?: string;
  /** Versão curta do nome para o celular (ex.: "Tela" em vez de "Compartilhar"). */
  shortCaption?: string;
  /** Ajuste do círculo do ícone (ex.: mais estreito para a setinha do microfone). */
  iconClassName?: string;
}

/**
 * Botão do dock: ícone num círculo e, com `caption`, o nome embaixo (estilo
 * FaceTime). Tooltip com o atalho e microinterações via GSAP. Repassa props e
 * ref ao <button>, então serve de gatilho de primitivos Radix
 * (`<Popover.Trigger asChild>`). Para indisponível, use `aria-disabled`: com
 * `disabled` o tooltip não abre.
 */
export function DockButton({
  label,
  tone = "default",
  pressed,
  shortcut,
  caption,
  shortCaption,
  iconClassName,
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  ...props
}: DockButtonProps) {
  const { contextSafe } = useGSAP();

  const animate = contextSafe((target: HTMLElement, vars: gsap.TweenVars) => {
    if (prefersReducedMotion() || target.getAttribute("aria-disabled") === "true") return;
    gsap.to(target, { duration: 0.25, ease: "power3.out", overwrite: "auto", ...vars });
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-anim="dock-item"
          aria-label={label}
          aria-pressed={pressed}
          aria-keyshortcuts={shortcut}
          {...props}
          onPointerEnter={(e) => {
            onPointerEnter?.(e);
            animate(e.currentTarget, { y: -2 });
          }}
          onPointerLeave={(e) => {
            onPointerLeave?.(e);
            animate(e.currentTarget, { y: 0, scale: 1 });
          }}
          onPointerDown={(e) => {
            onPointerDown?.(e);
            animate(e.currentTarget, { scale: 0.92, duration: 0.12 });
          }}
          onPointerUp={(e) => {
            onPointerUp?.(e);
            animate(e.currentTarget, { scale: 1 });
          }}
          className={cn(
            "group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl outline-none disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
            caption ? "min-w-14 px-1 sm:min-w-16" : "",
            className,
          )}
        >
          <span
            className={cn(
              "grid size-12 place-items-center rounded-full transition-colors group-focus-visible:ring-3 group-focus-visible:ring-brand/60",
              toneClasses[tone],
              iconClassName,
            )}
          >
            {children}
          </span>
          {caption ? (
            <span
              aria-hidden="true"
              className={cn(
                "text-sm leading-none font-semibold whitespace-nowrap",
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
            className="bg-background/15 px-1.5 py-0.5 font-sans text-[0.7rem] font-semibold"
          >
            {shortcut}
          </kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
