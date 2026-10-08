import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Small product shots for the use cases, in the room's fixed dark palette (like the demo
 * window). Decorative: the text beside each one says the same thing. Sizes use container
 * units, so each drawing scales like a picture.
 */

function Shot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="@container relative aspect-[4/3] w-full overflow-hidden rounded-[3cqi] border border-white/10 bg-[#161618] font-sans text-white shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)]"
    >
      <div className="flex items-center gap-[2cqi] border-b border-white/8 px-[4cqi] py-[2.6cqi] text-[3cqi] text-white/55">
        <span className="flex gap-[1.4cqi]">
          <span className="size-[2cqi] rounded-full bg-white/15" />
          <span className="size-[2cqi] rounded-full bg-white/15" />
          <span className="size-[2cqi] rounded-full bg-white/15" />
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Pointer({ name, className }: { name: string; className: string }) {
  return (
    <span className={`absolute flex items-start ${className}`}>
      <svg viewBox="0 0 16 16" className="size-[5cqi] text-[#8b5cf6] drop-shadow">
        <path
          d="M2 1.5 13.5 7 8 8.4 5.6 14z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="mt-[4cqi] rounded-full bg-[#8b5cf6] px-[2cqi] py-[0.5cqi] text-[2.8cqi] font-semibold">
        {name}
      </span>
    </span>
  );
}

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
        <span className="flex h-[2.8cqi] items-end gap-[0.6cqi]">
          <span className="h-full w-[0.7cqi] rounded bg-[#a2e1b2]" />
          <span className="h-1/2 w-[0.7cqi] rounded bg-[#a2e1b2]" />
          <span className="h-3/4 w-[0.7cqi] rounded bg-[#a2e1b2]" />
        </span>
      </span>
    </Shot>
  );
}

/** A sign-in screen under review, with Lia's pointer on the button and her comment. */
export function ReviewArt() {
  return (
    <Shot title="Figma · Tela de login">
      <div className="grid place-items-center px-[6cqi] py-[5cqi]">
        <div className="w-[62%] rounded-[2.4cqi] bg-white p-[4cqi] text-[#1f2023]">
          <p className="text-[4.4cqi] leading-tight font-semibold tracking-tight">
            Bem-vindo de volta
          </p>
          <span className="mt-[3cqi] block rounded-[1.4cqi] border border-[#d8d5ce] px-[2cqi] py-[1.4cqi] text-[2.6cqi] text-[#8a8a92]">
            voce@empresa.com
          </span>
          <span className="mt-[1.6cqi] block rounded-[1.4cqi] border border-[#d8d5ce] px-[2cqi] py-[1.4cqi] text-[2.6cqi] text-[#8a8a92]">
            ••••••••
          </span>
          <span className="mt-[3cqi] block w-[46%] rounded-full bg-[#1f2023] py-[1.4cqi] text-center text-[2.6cqi] font-semibold text-white">
            Entrar
          </span>
        </div>
      </div>
      <Pointer name="Lia" className="top-[70%] left-[36%]" />
      <span className="absolute top-[26%] right-[5cqi] max-w-[30%] rounded-[2cqi] rounded-tr-[0.6cqi] bg-[#2c2c30] px-[2.4cqi] py-[1.6cqi] text-[2.6cqi] leading-snug">
        <span className="font-semibold text-[#c4a7ff]">Lia:</span> esse botão podia ocupar a largura
        toda, né?
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
