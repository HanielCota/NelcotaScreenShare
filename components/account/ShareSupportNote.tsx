"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";
import { currentShareSupport, SHARE_SUPPORT_TEXT, type ShareSupport } from "@/lib/share-support";
import { cn } from "@/lib/utils";

const ICONS = { ok: CircleCheck, warn: TriangleAlert, info: Info } as const;
const ICON_COLORS = { ok: "text-success", warn: "text-warning", info: "text-brand-soft" } as const;

const noop = () => () => {};

/**
 * "Vai funcionar aqui?": o que o navegador de quem está vendo consegue fazer
 * na sala. No servidor não dá para saber, então a linha só aparece depois de
 * hidratar (sem piscar um texto errado).
 */
export function ShareSupportNote({ className }: { className?: string }) {
  const support = useSyncExternalStore<ShareSupport | null>(noop, currentShareSupport, () => null);
  if (!support) return null;
  const { tone, title, detail } = SHARE_SUPPORT_TEXT[support];
  const Icon = ICONS[tone];
  return (
    <p className={cn("flex gap-2.5 text-sm leading-snug", className)}>
      <Icon className={cn("mt-px size-4 shrink-0", ICON_COLORS[tone])} aria-hidden="true" />
      <span>
        <span className="font-semibold text-ink">{title}</span>
        {detail ? <span className="text-ink-muted"> {detail}</span> : null}
      </span>
    </p>
  );
}
