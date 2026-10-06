"use client";

import Link from "next/link";
import { Popover } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { ROOM_SHORTCUTS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { navItemClass } from "./nav-item-class";

/** Barra de vidro do topo, usada na home e na sala. Seções separadas por `NavDivider`. */
export function NavBar({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      className={cn("glass flex h-14 items-center gap-1 rounded-2xl px-2 sm:px-2.5", className)}
      {...props}
    />
  );
}

export function NavDivider({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("mx-1.5 h-6 w-px shrink-0 bg-line-strong", className)} />
  );
}

/** Ícone + nome. Sem `href` não é link (na sala, sair por engano derrubaria a chamada). */
export function NavBrand({
  href,
  showName = true,
  className: extraClass,
}: {
  href?: string;
  showName?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {/* oxlint-disable-next-line nextjs/no-img-element -- SVG estático pequeno, sem ganho com next/image. */}
      <img
        src="/icon.svg"
        alt={href ? "" : "Nelcota"}
        width={28}
        height={28}
        className="size-7 shrink-0"
      />
      {showName ? <span className="text-sm font-semibold tracking-tight">Nelcota</span> : null}
    </>
  );
  const className = cn("flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5", extraClass);
  return href ? (
    <Link
      href={href}
      aria-label="Nelcota, início"
      className={cn(className, "transition-colors hover:bg-surface-3")}
    >
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

export { navItemClass } from "./nav-item-class";

/** Item da navbar que abre um painel (popover) abaixo dele. */
export function NavPopover({
  trigger,
  label,
  iconOnly = false,
  align = "start",
  className,
  children,
}: {
  trigger: ReactNode;
  label: string;
  /** Gatilho só com ícone: usa o `label` como nome acessível. */
  iconOnly?: boolean;
  /** Itens do lado direito da barra abrem alinhados pelo fim. */
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        className={cn(navItemClass, className)}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align={align}
          sideOffset={12}
          collisionPadding={16}
          aria-label={label}
          className="glass z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-4 outline-none"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ShortcutsPanel() {
  return (
    <>
      <p className="text-sm font-semibold tracking-tight">Atalhos na sala</p>
      <dl className="mt-3 flex flex-col gap-2">
        {ROOM_SHORTCUTS.map(({ key, action }) => (
          <div key={key} className="flex items-center gap-3 text-sm">
            <dt>
              <kbd className="grid size-7 place-items-center rounded-lg border border-line-strong bg-surface-2 text-xs font-semibold">
                {key}
              </kbd>
            </dt>
            <dd className="text-ink-muted">{action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-subtle">Não disparam enquanto você digita.</p>
    </>
  );
}
