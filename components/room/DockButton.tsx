"use client";

import type { ComponentProps } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type DockTone = "default" | "active" | "danger" | "muted";

const toneClasses: Record<DockTone, string> = {
  default: "bg-surface-2 text-ink hover:bg-surface-3",
  active: "bg-brand text-brand-ink hover:bg-brand-hover",
  danger: "bg-danger/90 text-canvas hover:bg-danger",
  muted: "bg-danger/15 text-danger hover:bg-danger/25",
};

interface DockButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  label: string;
  tone?: DockTone;
  pressed?: boolean;
}

/**
 * Botão do dock com tooltip e microinterações (hover/press) via GSAP.
 * Repassa props e ref ao <button>, então pode ser usado como gatilho
 * de outros primitivos Radix (ex.: `<Popover.Trigger asChild>`).
 * Para indisponível, use `aria-disabled`: com `disabled` o tooltip não abre.
 */
export function DockButton({
  label,
  tone = "default",
  pressed,
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
          {...props}
          onPointerEnter={(e) => {
            onPointerEnter?.(e);
            animate(e.currentTarget, { y: -3, scale: 1.06 });
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
            animate(e.currentTarget, { scale: 1.06 });
          }}
          className={cn(
            "grid size-12 place-items-center rounded-2xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 sm:size-13",
            toneClasses[tone],
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
