import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { PointerArrow, WindowDots } from "../demo/RoomChrome";

/**
 * Small product shots for the use cases, in the room's fixed dark palette (like the demo
 * window). Decorative: the text beside each one says the same thing. Sizes use container
 * units, so each drawing scales like a picture.
 */

function Shot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="@container relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#161618] font-sans text-white shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)]"
    >
      <div className="flex items-center gap-[2cqi] border-b border-white/8 px-[4cqi] py-[2.6cqi] text-[3cqi] text-white/55">
        <WindowDots className="gap-[1.4cqi]" dot="size-[2cqi]" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Pointer({ name, className }: { name: string; className: string }) {
  return (
    <span className={`absolute flex items-start ${className}`}>
      <PointerArrow className="size-[5cqi]" />
      <span className="mt-[4cqi] rounded-full bg-[#8b5cf6] px-[2cqi] py-[0.5cqi] text-[2.8cqi] font-semibold">
        {name}
      </span>
    </span>
  );
}

/** The level bars of the sound badge: heights and a rhythm per bar, fixed for SSR. */
const SOUND_LEVELS = [
  { height: "100%", duration: "0.9s", delay: "-0.2s" },
  { height: "55%", duration: "1.2s", delay: "-0.5s" },
  { height: "80%", duration: "1s", delay: "-0.8s" },
];

/** The app's console while the bug happens, with the computer's sound going along. */
export function BugArt() {
  const logs = [
    ["12:04:31", "GET /api/cart 200", "text-white/45"],
    ["12:04:31", "render <Checkout>", "text-white/45"],
    ["12:04:32", "POST /api/checkout 500", "text-[#ffb27a]"],
  ];
  return (
    <Shot title="Console · localhost:5173">
      <div className="flex flex-col gap-[1.6cqi] px-[4cqi] py-[3.5cqi] font-mono text-[2.8cqi] leading-[1.5]">
        {logs.map(([time, text, tone]) => (
          <p key={text} className={tone}>
            <span className="text-white/25">{time}</span> {text}
          </p>
        ))}
        <div className="rounded-[1.6cqi] border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-[2.5cqi] py-[2cqi] text-[#ff9a9a]">
          <p>Uncaught TypeError: total is not a number</p>
          <p className="text-[#ff9a9a]/60"> at Checkout (Checkout.tsx:38)</p>
        </div>
      </div>
      <span className="absolute right-[4cqi] bottom-[4cqi] inline-flex items-center gap-[1.6cqi] rounded-full bg-black/60 px-[2.6cqi] py-[1.2cqi] text-[2.8cqi] font-medium">
        <Volume2 className="size-[3.4cqi] text-[#a2e1b2]" />
        som do computador
        {/* The sound is playing: each bar moves on its own rhythm, from the baseline. */}
        <span className="flex h-[2.8cqi] items-end gap-[0.6cqi]">
          {SOUND_LEVELS.map(({ height, duration, delay }) => (
            <span
              key={delay}
              style={{ height, animationDuration: duration, animationDelay: delay }}
              className="w-[0.7cqi] origin-bottom rounded bg-[#a2e1b2] motion-safe:animate-[talk_1s_ease-in-out_infinite]"
            />
          ))}
        </span>
      </span>
    </Shot>
  );
}

/** The four corner handles of a selection box. */
const HANDLES = [
  "-top-[0.7cqi] -left-[0.7cqi]",
  "-top-[0.7cqi] -right-[0.7cqi]",
  "-bottom-[0.7cqi] -left-[0.7cqi]",
  "-right-[0.7cqi] -bottom-[0.7cqi]",
];

/**
 * A sign-in screen under review, drawn like a design canvas: the frame on a dotted board,
 * the button selected with its size, Lia's pointer on it and her comment pinned beside it,
 * with Bruno's answer.
 */
export function ReviewArt() {
  return (
    <Shot title="Figma · Tela de login">
      <div className="relative h-full bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-size-[3cqi_3cqi] px-[6cqi] pt-[4cqi]">
        <p className="mb-[1.2cqi] text-[2.4cqi] text-white/45">Login · Desktop</p>
        <div className="w-[54%] rounded-[2cqi] bg-white p-[4cqi] text-[#1f2023] shadow-[0_12px_40px_-12px_rgb(0_0_0/0.6)]">
          <p className="text-[4.2cqi] leading-tight font-semibold tracking-tight">
            Bem-vindo de volta
          </p>
          <span className="mt-[3cqi] block rounded-[1.4cqi] border border-[#d8d5ce] px-[2cqi] py-[1.4cqi] text-[2.6cqi] text-[#8a8a92]">
            voce@empresa.com
          </span>
          <span className="mt-[1.6cqi] block rounded-[1.4cqi] border border-[#d8d5ce] px-[2cqi] py-[1.4cqi] text-[2.6cqi] text-[#8a8a92]">
            ••••••••
          </span>
          {/* The button under discussion, selected: outline, handles and its size. */}
          <span className="relative mt-[3cqi] block w-[46%]">
            <span className="block rounded-full bg-[#1f2023] py-[1.4cqi] text-center text-[2.6cqi] font-semibold text-white">
              Entrar
            </span>
            <span className="pointer-events-none absolute -inset-[0.8cqi] border-[0.3cqi] border-[#0d99ff]">
              {HANDLES.map((place) => (
                <span
                  key={place}
                  className={`absolute size-[1.4cqi] border-[0.3cqi] border-[#0d99ff] bg-white ${place}`}
                />
              ))}
            </span>
            <span className="absolute -bottom-[5cqi] left-1/2 -translate-x-1/2 rounded-[0.6cqi] bg-[#0d99ff] px-[1cqi] py-[0.2cqi] text-[2cqi] font-medium whitespace-nowrap text-white tabular-nums">
              96 × 32
            </span>
          </span>
        </div>
      </div>
      <Pointer name="Lia" className="top-[68%] left-[30%]" />
      {/* Lia's comment, pinned next to the button, with a reply. */}
      <span className="absolute top-[64%] left-[64%] grid size-[5cqi] place-items-center rounded-full rounded-bl-none bg-[#8b5cf6] text-[2.4cqi] font-semibold">
        L
      </span>
      <span className="absolute top-[18%] right-[4cqi] flex w-[32%] flex-col gap-[1.6cqi] rounded-[2cqi] border border-white/10 bg-[#232327] p-[2.4cqi] text-[2.4cqi] leading-snug shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)]">
        <span>
          <span className="font-semibold text-[#c4a7ff]">Lia</span>
          <span className="text-white/40"> · agora</span>
          <span className="mt-[0.6cqi] block text-white/90">
            Esse botão podia ocupar a largura toda, né?
          </span>
        </span>
        <span className="border-t border-white/10 pt-[1.6cqi]">
          <span className="font-semibold text-[#8ab4ff]">Bruno</span>
          <span className="mt-[0.6cqi] block text-white/90">Boa, já mudo.</span>
        </span>
      </span>
    </Shot>
  );
}

/** An editor, with the teammate's screen floating on top of it (picture in picture). */
export function PairingArt() {
  const lines = [
    ["describe", "(", '"checkout"', ", () => {"],
    ["  it", "(", '"soma o carrinho"', ", () => {"],
    ["    expect", "(total(cart)).", "toBe", "(42);"],
    ["  });"],
    ["});"],
  ];
  return (
    <Shot title="checkout.test.ts">
      <div className="flex flex-col gap-[1.2cqi] px-[4cqi] py-[3.5cqi] font-mono text-[2.8cqi] leading-[1.5] whitespace-pre text-[#e6e6ea]">
        {lines.map(([fn, ...rest], index) => (
          <p key={index}>
            <span className="text-[#8ab4ff]">{fn}</span>
            {rest.map((part, partIndex) => (
              <span key={partIndex} className={part.startsWith('"') ? "text-[#a2e1b2]" : undefined}>
                {part}
              </span>
            ))}
          </p>
        ))}
      </div>
      <div className="absolute right-[4cqi] bottom-[4cqi] w-[48%] overflow-hidden rounded-[2cqi] border border-white/15 bg-[#0d0d0f] shadow-[0_20px_40px_-12px_rgb(0_0_0/0.9)]">
        <div className="flex items-center gap-[1.4cqi] border-b border-white/8 px-[2.4cqi] py-[1.4cqi] text-[2.4cqi] text-white/60">
          <span className="size-[1.6cqi] rounded-full bg-[#4ade80]" />
          Tela de Rafa
        </div>
        <div className="px-[2.4cqi] py-[2cqi] font-mono text-[2.4cqi] leading-[1.6]">
          <p className="text-[#4ade80]">✓ soma o carrinho</p>
          <p className="text-[#4ade80]">✓ aplica o cupom</p>
          <p className="text-white/50">2 passed · 0.41s</p>
        </div>
      </div>
    </Shot>
  );
}
