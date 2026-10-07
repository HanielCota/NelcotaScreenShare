import { Popover } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Painel que abre do dock: mesmo vidro, mesma distância e a mesma entrada
 * (sobe e cresce a partir do botão) em todos os menus da sala.
 */
export function DockPopoverContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Popover.Content>) {
  return (
    <Popover.Portal>
      <Popover.Content
        side="top"
        align="center"
        sideOffset={14}
        collisionPadding={16}
        {...props}
        className={cn(
          "glass z-50 origin-(--radix-popover-content-transform-origin) rounded-2xl p-2 outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "motion-reduce:animate-none",
          className,
        )}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
}

/** Título do painel, alinhado com o texto das opções. */
export function DockPopoverTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-2.5">
      <p className="text-sm font-medium tracking-tight">{children}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}
