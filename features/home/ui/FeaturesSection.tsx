import { Check, Mic } from "lucide-react";
import type { ReactNode } from "react";
import { ROOM_SHORTCUTS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { SectionIntro } from "./SectionIntro";

/** One tile: a two-tone headline over its own picture of the room. */
function Tile({
  title,
  rest,
  className,
  children,
}: {
  title: string;
  /** The quieter end of the headline. */
  rest: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      data-fx="rise"
      className={cn(
        "flex flex-col gap-8 overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8",
        className,
      )}
    >
      <h3 className="max-w-md text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-3xl">
        {title} <span className="text-ink-subtle">{rest}</span>
      </h3>
      <div aria-hidden="true" className="mt-auto">
        {children}
      </div>
    </li>
  );
}

/** Heights of the level meter, as the pre-join screen draws it. */
const LEVELS = [30, 55, 80, 65, 95, 70, 45, 85, 60, 40, 75, 50, 35, 20, 12, 8];

/** A voice, drawn as a symmetric waveform around the middle bar. */
const WAVE = [
  12, 20, 34, 26, 48, 38, 62, 44, 78, 56, 92, 70, 100, 70, 92, 56, 78, 44, 62, 38, 48, 26, 34, 20,
  12,
];

function MicCheck() {
  return (
    <div className="flex flex-col gap-6">
      <span className="flex h-24 items-center justify-center gap-1.5 sm:h-28">
        {WAVE.map((height, index) => (
          <span
            key={index}
            style={{ height: `${height}%` }}
            className="w-1.5 rounded-full bg-brand/80 sm:w-2"
          />
        ))}
      </span>
      <MicDevice />
    </div>
  );
}

function MicDevice() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
      <span className="flex items-center gap-3 text-sm">
        <span className="grid size-9 place-items-center rounded-full bg-brand/15 text-brand-soft">
          <Mic className="size-4" />
        </span>
        <span className="flex-1 font-medium">Microfone do notebook</span>
        <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand-soft">
          Padrão
        </span>
      </span>
      <span className="flex items-center gap-3 rounded-xl bg-surface-3/60 px-3 py-2.5 text-sm">
        <Check className="size-4 text-brand-soft" />
        <span className="font-medium text-brand-soft">Captando áudio</span>
        <span className="ml-auto flex h-5 items-end gap-1">
          {LEVELS.map((level, index) => (
            <span
              key={index}
              style={{ height: `${level}%` }}
              className={cn("w-1 rounded-full", index < 12 ? "bg-brand" : "bg-ink/15")}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

function FloatingWindow() {
  return (
    <div className="relative aspect-[4/3] rounded-2xl bg-surface-2 p-4">
      <div className="flex flex-col gap-2">
        <span className="h-2 w-1/3 rounded-full bg-ink/20" />
        <span className="h-2 w-2/3 rounded-full bg-ink/10" />
        <span className="h-2 w-1/2 rounded-full bg-ink/10" />
        <span className="h-2 w-3/5 rounded-full bg-ink/10" />
      </div>
      <div className="absolute right-3 bottom-3 w-[58%] overflow-hidden rounded-xl border border-line-strong bg-[#161618] text-white shadow-soft">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5 text-xs text-white/70">
          <span className="size-1.5 rounded-full bg-[#4ade80]" />
          Tela de Bruno
        </div>
        <div className="flex aspect-video items-end gap-1 p-2.5">
          {[40, 70, 55, 85, 65].map((height) => (
            <span
              key={height}
              style={{ height: `${height}%` }}
              className="flex-1 rounded-t bg-[#a2e1b2]/70"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Enough faces for the largest room the server allows (8). */
const PEOPLE = [
  ["B", "bg-[#3b82f6] text-white"],
  ["A", "bg-[#8b5cf6] text-white"],
  ["I", "bg-[#a2e1b2] text-[#14281c]"],
  ["R", "bg-[#f59e0b] text-[#2b1a00]"],
  ["L", "bg-[#ec4899] text-white"],
  ["G", "bg-[#14b8a6] text-white"],
  ["T", "bg-[#ef4444] text-white"],
  ["M", "bg-[#64748b] text-white"],
];

function People({ max }: { max: number }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <span className="text-[5.5rem] leading-none font-semibold tracking-[-0.06em] text-brand-soft tabular-nums">
        {max}
      </span>
      <span className="flex -space-x-3">
        {PEOPLE.slice(0, max).map(([initial, tone]) => (
          <span
            key={initial}
            className={`grid size-11 place-items-center rounded-full text-sm font-semibold ring-4 ring-surface ${tone}`}
          >
            {initial}
          </span>
        ))}
      </span>
    </div>
  );
}

function Keyboard() {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2.5">
      {ROOM_SHORTCUTS.map(({ key, action }) => (
        <li key={key} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-3">
          <kbd className="grid size-10 shrink-0 place-items-center rounded-lg border border-b-[3px] border-line-strong bg-surface font-sans text-base font-semibold">
            {key}
          </kbd>
          <span className="text-xs leading-snug text-ink-muted">{action}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * What the room does beyond the demo (sound, pointer and chat are shown there), as tiles that
 * each pair a two-tone headline with a picture of the room. The size comes from the server.
 */
export function FeaturesSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section
      id="recursos"
      aria-labelledby="features-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro id="features-title" title="Os detalhes." subtitle="Que fazem diferença." />

      <ul className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-5">
        <Tile
          title="Microfone testado."
          rest="Você vê o nível do som antes de entrar. Sem “alô, tão me ouvindo?”."
          className="md:col-span-3"
        >
          <MicCheck />
        </Tile>
        <Tile
          title="Janela flutuante."
          rest="A tela de alguém por cima dos seus apps."
          className="md:col-span-2"
        >
          <FloatingWindow />
        </Tile>
        <Tile
          title={`Até ${maxParticipants} pessoas.`}
          rest="Pequenas de propósito: todo mundo vê, ouve e participa."
          className="md:col-span-2"
        >
          <People max={maxParticipants} />
        </Tile>
        <Tile
          title="Tudo no teclado."
          rest="Uma tecla para cada ação, que não dispara enquanto você digita."
          className="md:col-span-3"
        >
          <Keyboard />
        </Tile>
      </ul>
    </section>
  );
}
