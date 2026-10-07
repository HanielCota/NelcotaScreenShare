import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  currentShareSupport,
  SHARE_SUPPORT_TEXT,
  type ShareSupport,
} from "@/features/room/domain/share-support";
import { cn } from "@/lib/utils";

const ICONS = { ok: CircleCheck, warn: TriangleAlert, info: Info } as const;
const ICON_COLORS = { ok: "text-success", warn: "text-warning", info: "text-brand-soft" } as const;

const DOT_COLORS = { ok: "bg-success", warn: "bg-warning", info: "bg-brand-soft" } as const;

const noop = () => () => {};

/**
 * "Vai funcionar aqui?": o que o navegador de quem está vendo consegue fazer
 * na sala. No servidor não dá para saber, então a linha só aparece depois de
 * hidratar (sem piscar um texto errado).
 */
export function ShareSupportNote({
  className,
  variant = "line",
}: {
  className?: string;
  /** "line": telas de acesso. "badge": rodapé. "prejoin": orientação do próximo passo. */
  variant?: "line" | "badge" | "prejoin";
}) {
  const support = useSyncExternalStore<ShareSupport | null>(noop, currentShareSupport, () => null);
  if (!support) return null;
  const { tone, title, detail } = SHARE_SUPPORT_TEXT[support];
  const Icon = ICONS[tone];
  if (variant === "prejoin") {
    const canShare = support === "full" || support === "screen-only" || support === "safari";
    return (
      <div
        className={cn(
          "flex max-w-full flex-col gap-1 text-center text-sm text-ink-muted",
          className,
        )}
      >
        <p>
          {canShare
            ? "Você poderá compartilhar sua tela depois de entrar."
            : "Depois de entrar, você poderá conversar e assistir."}
        </p>
        {detail ? <p className="text-xs text-ink-subtle">{detail}</p> : null}
      </div>
    );
  }
  if (variant === "badge") {
    // "Tudo certo" cabe numa linha; aviso (Safari, celular) mostra a orientação,
    // porque no celular não há "passar o mouse" para ler um title.
    const showDetail = tone !== "ok" && detail;
    return (
      <p
        className={cn(
          "inline-flex max-w-full items-start gap-2 rounded-2xl border border-line bg-surface/60 px-3 py-1.5 text-left text-xs leading-relaxed font-medium text-ink-muted",
          className,
        )}
      >
        <span
          className={cn("mt-[0.4rem] size-1.5 shrink-0 rounded-full", DOT_COLORS[tone])}
          aria-hidden="true"
        />
        <span>
          {title}
          {showDetail ? <span className="text-ink-subtle"> {detail}</span> : null}
        </span>
      </p>
    );
  }
  return (
    <p className={cn("flex gap-2.5 text-sm leading-snug", className)}>
      <Icon className={cn("mt-px size-4 shrink-0", ICON_COLORS[tone])} aria-hidden="true" />
      <span>
        <span className="font-medium text-ink">{title}</span>
        {detail ? <span className="text-ink-muted"> {detail}</span> : null}
      </span>
    </p>
  );
}
