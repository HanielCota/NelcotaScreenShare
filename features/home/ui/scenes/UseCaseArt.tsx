import { Volume2 } from "lucide-react";

/** Small drawings for the use cases, made of the same shapes as the room (decorative). */

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="panel relative aspect-[4/3] w-full overflow-hidden rounded-2xl p-[6%]"
    >
      {children}
    </div>
  );
}

/** A stack trace with the failing line, and the computer's sound coming along. */
export function BugArt() {
  return (
    <Pane>
      <div className="flex flex-col gap-2.5">
        <span className="h-2 w-2/5 rounded-full bg-ink/20" />
        <span className="h-2 w-3/4 rounded-full bg-ink/10" />
        <span className="flex items-center gap-2 rounded-lg bg-danger/12 px-2 py-1.5 font-sans text-xs font-medium text-danger">
          TypeError: cannot read “total”
        </span>
        <span className="h-2 w-2/3 rounded-full bg-ink/10" />
        <span className="h-2 w-1/2 rounded-full bg-ink/10" />
      </div>
      <span className="absolute right-[6%] bottom-[8%] inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium">
        <Volume2 className="size-3.5 text-brand-soft" />
        som do computador
      </span>
    </Pane>
  );
}

/** A screen under review, with someone's pointer on the button to change. */
export function ReviewArt() {
  return (
    <Pane>
      <div className="flex h-full flex-col gap-3">
        <span className="h-3 w-1/3 rounded-full bg-ink/20" />
        <div className="grid flex-1 grid-cols-3 gap-2">
          <span className="rounded-xl bg-ink/6" />
          <span className="rounded-xl bg-ink/6" />
          <span className="rounded-xl bg-ink/6" />
        </div>
        <span className="w-fit rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-brand-ink">
          Assinar
        </span>
      </div>
      <span className="absolute bottom-[14%] left-[30%] flex items-start">
        <svg viewBox="0 0 16 16" className="size-6 text-violet drop-shadow">
          <path
            d="M2 1.5 13.5 7 8 8.4 5.6 14z"
            fill="currentColor"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        <span className="mt-4 rounded-full bg-violet px-2 py-0.5 text-xs font-semibold text-canvas">
          Lia
        </span>
      </span>
    </Pane>
  );
}

/** An editor, with the other person's screen floating on top of it. */
export function PairingArt() {
  return (
    <Pane>
      <div className="flex flex-col gap-2.5">
        {[64, 80, 48, 72, 56, 40].map((width, index) => (
          <span
            key={index}
            style={{ width: `${width}%`, marginLeft: `${(index % 3) * 6}%` }}
            className="h-2 rounded-full bg-ink/12"
          />
        ))}
      </div>
      <div className="absolute right-[6%] bottom-[8%] w-[42%] overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-soft">
        <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
          <span className="size-1.5 rounded-full bg-ink/20" />
          <span className="size-1.5 rounded-full bg-ink/20" />
          <span className="ml-1 text-xs font-medium text-ink-muted">Tela de Rafa</span>
        </div>
        <div className="flex aspect-video items-end gap-1 p-2">
          {[40, 70, 55, 85].map((height) => (
            <span
              key={height}
              style={{ height: `${height}%` }}
              className="flex-1 rounded-t bg-brand/60"
            />
          ))}
        </div>
      </div>
    </Pane>
  );
}
