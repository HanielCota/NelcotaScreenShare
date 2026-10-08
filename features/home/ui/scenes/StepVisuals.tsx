import { AppWindow, Check, Copy, Link2, Monitor, Plus, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What the browser shows at each step, drawn with the theme tokens. They sit stacked inside
 * one browser window, so each fills it and centers its content.
 */

/** Screens shrink their padding on short viewports, where the pinned browser is shorter. */
const SCREEN =
  "grid place-items-center p-4 [grid-area:1/1] sm:p-8 sm:[@media(max-height:50rem)]:p-2";

/** The home page: the bar where Enter creates the room. */
export function CreateScreen({ className }: { className?: string }) {
  return (
    <div data-step-screen className={cn(SCREEN, className)}>
      <div className="flex w-full max-w-md min-w-0 flex-col items-center gap-4 sm:gap-6">
        <p className="text-xl font-semibold tracking-[-0.03em] sm:text-3xl">Mostre sua tela.</p>
        <div className="flex h-12 w-full items-center gap-2 rounded-full border border-line bg-canvas pr-1.5 pl-4 shadow-soft sm:h-14 sm:pl-5">
          <Link2 className="size-4 shrink-0 text-ink-subtle" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink-subtle">
            Link ou código da sala
          </span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3 text-sm font-medium text-brand-ink sm:h-11 sm:px-4">
            <Plus className="size-4" />
            Criar sala
          </span>
        </div>
        <kbd className="inline-flex h-10 items-center rounded-xl border border-b-[3px] border-line-strong bg-surface-2 px-4 font-sans text-sm font-semibold sm:h-12 sm:px-5 sm:text-base">
          Enter ↵
        </kbd>
      </div>
    </div>
  );
}

/** The new room: its link copied, and the people it was sent to arriving. */
export function LinkScreen({ className }: { className?: string }) {
  return (
    <div data-step-screen className={cn(SCREEN, className)}>
      <div className="flex w-full max-w-md min-w-0 flex-col items-center gap-4 sm:gap-6">
        <p className="text-xl font-semibold tracking-[-0.03em] sm:text-3xl">Sala pronta.</p>
        <div className="flex h-12 w-full items-center gap-2 rounded-full border border-line bg-canvas pr-1.5 pl-4 shadow-soft sm:h-14 sm:pl-5">
          <Copy className="size-4 shrink-0 text-ink-subtle" />
          <span className="min-w-0 flex-1 truncate text-sm tabular-nums">
            nelcota.app/sala/kfa-mtrx-q2p
          </span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3 text-sm font-medium text-brand-ink sm:h-11 sm:px-4">
            <Check className="size-4" />
            <span className="max-sm:sr-only">Copiado</span>
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-[#8b5cf6] text-xs font-semibold text-white">
              A
            </span>
            Ana entrou
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-[#a2e1b2] text-xs font-semibold text-[#14281c]">
              I
            </span>
            Iris <span className="text-ink-subtle">(convidado)</span> entrou
          </span>
        </div>
      </div>
    </div>
  );
}

const SHARE_OPTIONS = [
  { icon: AppWindow, label: "Aba", active: true },
  { icon: AppWindow, label: "Janela", active: false },
  { icon: Monitor, label: "Tela inteira", active: false },
];

/** The browser's share picker: what to show, with the computer's sound on. */
export function ShareScreen({ className }: { className?: string }) {
  return (
    <div data-step-screen className={cn(SCREEN, className)}>
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-line bg-canvas p-3 shadow-soft [@media(min-height:50rem)]:gap-4 [@media(min-height:50rem)]:p-4">
        <p className="text-sm font-semibold">Escolha o que compartilhar</p>
        <div className="grid grid-cols-3 gap-2">
          {SHARE_OPTIONS.map(({ icon: Icon, label, active }) => (
            <span
              key={label}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-xs",
                active ? "border-brand bg-brand/12 font-medium" : "border-line text-ink-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <Volume2 className="size-4 text-brand-soft" />
          <span className="flex-1">Compartilhar áudio</span>
          <span className="relative h-5 w-9 rounded-full bg-brand">
            <span className="absolute top-0.5 right-0.5 size-4 rounded-full bg-white" />
          </span>
        </span>
        <span className="self-end rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink">
          Compartilhar
        </span>
      </div>
    </div>
  );
}
