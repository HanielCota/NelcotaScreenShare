import { Hand, MessageSquare, Mic, MonitorUp, PhoneOff, Volume2 } from "lucide-react";
import type { ReactNode } from "react";

/** Bars of the fake shared report (heights in %). */
const CHART = [38, 54, 46, 70, 62, 84, 76];

function Avatar({ initial, tone }: { initial: string; tone: string }) {
  return (
    <span
      className={`grid size-6 place-items-center rounded-full text-[0.625rem] font-semibold ring-2 ring-surface ${tone}`}
    >
      {initial}
    </span>
  );
}

function DockKey({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "grid size-8 place-items-center rounded-full bg-brand text-brand-ink"
          : "grid size-8 place-items-center rounded-full bg-surface-3 text-ink-muted"
      }
    >
      {children}
    </span>
  );
}

/** What is being shared: a small sales report with a "Publicar" button. */
function SharedReport() {
  return (
    <div className="absolute inset-0 flex gap-[3%] bg-surface p-[4%]">
      <div className="flex w-[18%] flex-col gap-2 max-sm:hidden">
        <span className="h-2 w-3/4 rounded-full bg-ink/15" />
        <span className="h-2 w-full rounded-full bg-ink/8" />
        <span className="h-2 w-2/3 rounded-full bg-ink/8" />
        <span className="h-2 w-5/6 rounded-full bg-ink/8" />
      </div>
      <div className="flex flex-1 flex-col gap-[4%]">
        <span className="h-2.5 w-2/5 rounded-full bg-ink/20" />
        <div className="flex flex-1 items-end gap-[4%] rounded-xl border border-line p-[4%]">
          {CHART.map((height, index) => (
            <span
              key={index}
              data-demo="bar"
              style={{ height: `${height}%` }}
              className="flex-1 origin-bottom rounded-t-md bg-brand/70"
            />
          ))}
        </div>
      </div>
      <span
        data-demo="target"
        className="absolute top-[7%] left-[74%] rounded-full bg-brand px-[3%] py-[1.5%] text-[0.625rem] font-semibold text-brand-ink ring-brand-soft/40 sm:text-xs"
      >
        Publicar
      </span>
    </div>
  );
}

/** Someone else's pointer, as the room draws it (arrow + name). */
function RemotePointer() {
  return (
    // The layer is as large as the stage, so xPercent/yPercent are stage percentages.
    <div
      data-demo="pointer"
      className="pointer-events-none absolute inset-0"
      style={{ transform: "translate(80%, 12%)" }}
    >
      <span
        data-demo="ripple"
        className="absolute -top-2 -left-2 size-6 rounded-full border-2 border-violet opacity-0"
      />
      <svg viewBox="0 0 16 16" className="size-5 text-violet drop-shadow" aria-hidden="true">
        <path
          d="M2 1.5 13.5 7 8 8.4 5.6 14z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="ml-3 inline-block rounded-full bg-violet px-2 py-0.5 text-[0.625rem] font-semibold text-canvas">
        Ana
      </span>
    </div>
  );
}

/**
 * A miniature of the room: Bruno shares a report with sound, Ana points at the
 * button, reacts and writes in the chat. Every element starts in its final state,
 * so the picture makes sense without JavaScript or with reduced motion.
 */
export function DemoWindow() {
  return (
    <figure className="panel overflow-hidden rounded-3xl">
      <figcaption className="sr-only">
        Prévia de uma sala do Nelcota: Bruno compartilha um relatório com som, Ana aponta para o
        botão Publicar, reage e escreve no chat.
      </figcaption>
      <div aria-hidden="true">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-ink/15" />
            <span className="size-2.5 rounded-full bg-ink/15" />
            <span className="size-2.5 rounded-full bg-ink/15" />
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-muted tabular-nums">
            kfa-mtrx-q2p
          </span>
          <span className="ml-auto flex -space-x-1.5">
            <Avatar initial="B" tone="bg-info text-canvas" />
            <Avatar initial="A" tone="bg-violet text-canvas" />
            <Avatar initial="V" tone="bg-brand text-brand-ink" />
          </span>
        </div>

        <div className="p-3 sm:p-4">
          <div
            data-demo="stage"
            className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2"
          >
            <div data-demo="screen" className="absolute inset-0">
              <SharedReport />
            </div>
            <span
              data-demo="badge"
              className="absolute bottom-[5%] left-[4%] inline-flex items-center gap-1.5 rounded-full bg-canvas/85 px-2.5 py-1 text-[0.625rem] font-medium backdrop-blur sm:text-xs"
            >
              <Volume2 className="size-3.5 text-brand-soft" aria-hidden="true" />
              Bruno · tela com som
              <span className="flex h-3 items-end gap-0.5">
                <span data-demo="level" className="h-full w-0.5 origin-bottom rounded bg-brand" />
                <span data-demo="level" className="h-2/3 w-0.5 origin-bottom rounded bg-brand" />
                <span data-demo="level" className="h-full w-0.5 origin-bottom rounded bg-brand" />
              </span>
            </span>
            <RemotePointer />
            <span
              data-demo="reaction"
              className="absolute right-[6%] bottom-[8%] grid size-9 place-items-center rounded-full bg-canvas/85 text-lg backdrop-blur"
            >
              👏
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              data-demo="hand"
              className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning"
            >
              <Hand className="size-3.5" aria-hidden="true" />
              Ana levantou a mão
            </span>
            <span
              data-demo="chat"
              className="ml-auto truncate rounded-2xl rounded-br-md bg-surface-3 px-3 py-1.5 text-xs max-sm:hidden"
            >
              <span className="font-semibold text-violet">Ana:</span> é esse botão aqui?
            </span>
          </div>

          <div className="mt-3 flex justify-center gap-2">
            <DockKey>
              <Mic className="size-4" />
            </DockKey>
            <DockKey active>
              <MonitorUp className="size-4" />
            </DockKey>
            <DockKey>
              <Hand className="size-4" />
            </DockKey>
            <DockKey>
              <MessageSquare className="size-4" />
            </DockKey>
            <span className="grid size-8 place-items-center rounded-full bg-danger/15 text-danger">
              <PhoneOff className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
