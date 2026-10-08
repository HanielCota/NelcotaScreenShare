import { Hand, MessageSquare, Mic, MonitorUp, PhoneOff, Volume2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A miniature of a real call, drawn with a fixed dark palette (the room's own look, the
 * same in both themes). Sizes use container units, so it scales like a picture.
 */

const TONES = {
  keyword: "text-[#c4a7ff]",
  fn: "text-[#8ab4ff]",
  type: "text-[#7fd8c7]",
  string: "text-[#a2e1b2]",
  number: "text-[#ffb27a]",
};

type Token = [text: string, tone?: keyof typeof TONES];

/** The file Bruno is sharing; "BUG" marks where the pointer lands (line 4). */
const CODE: Token[][] = [
  [
    ["import", "keyword"],
    [" { "],
    ["Cart", "type"],
    [" } "],
    ["from", "keyword"],
    [' "./types"', "string"],
    [";"],
  ],
  [],
  [["export function", "keyword"], [" "], ["total", "fn"], ["(cart?: "], ["Cart", "type"], [") {"]],
  [["  return", "keyword"], [" "], ["BUG"], [".reduce("]],
  [["    (sum, item) => sum + item.price * item.qty,"]],
  [["    "], ["0", "number"], [","]],
  [["  );"]],
  [["}"]],
];

/** Ana's pointer, as the room draws it: arrow and name. It rests on the bug. */
function RemotePointer() {
  return (
    <span
      data-demo="pointer"
      className="pointer-events-none absolute top-[70%] left-[55%] z-10 flex items-start"
    >
      <span
        data-demo="ripple"
        className="absolute -top-[1.2cqi] -left-[1.2cqi] size-[3cqi] rounded-full border-2 border-[#a78bfa] opacity-0"
      />
      <svg viewBox="0 0 16 16" className="size-[2.6cqi] text-[#8b5cf6] drop-shadow">
        <path
          d="M2 1.5 13.5 7 8 8.4 5.6 14z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="mt-[2cqi] rounded-full bg-[#8b5cf6] px-[1.2cqi] py-[0.3cqi] font-sans text-[1.5cqi] font-semibold text-white">
        Ana
      </span>
    </span>
  );
}

function CodeLine({ tokens, number }: { tokens: Token[]; number: number }) {
  return (
    <div data-demo="line" className="flex gap-[3cqi] whitespace-pre">
      <span className="w-[2.5cqi] text-right text-white/25 tabular-nums">{number}</span>
      <span>
        {tokens.map(([text, tone], index) => {
          if (text === "BUG") {
            return (
              <span
                key={index}
                data-demo="target"
                className="relative inline-block underline decoration-[#ff6b6b] decoration-wavy underline-offset-[0.5cqi]"
              >
                cart.items
                <RemotePointer />
              </span>
            );
          }
          return (
            <span key={index} className={tone ? TONES[tone] : undefined}>
              {text}
            </span>
          );
        })}
      </span>
    </div>
  );
}

/** What Bruno shares: an editor with the failing file and the error in the terminal. */
function SharedEditor() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#1b1b1f] font-mono text-[1.75cqi] leading-[1.7] text-[#e6e6ea]">
      <div className="flex border-b border-white/8 font-sans text-[1.4cqi]">
        <span className="border-r border-white/8 bg-[#232328] px-[2cqi] py-[0.9cqi] text-white">
          cart.ts
        </span>
        <span className="px-[2cqi] py-[0.9cqi] text-white/40">checkout.tsx</span>
      </div>
      <div className="flex-1 px-[2cqi] py-[1.6cqi]">
        {CODE.map((tokens, index) => (
          <CodeLine key={index} tokens={tokens} number={index + 1} />
        ))}
      </div>
      <div
        data-demo="terminal"
        className="border-t border-white/8 bg-[#141417] px-[2cqi] py-[1.2cqi] text-[1.4cqi] leading-[1.6]"
      >
        <p className="text-[#ff8a8a]">
          TypeError: Cannot read properties of undefined (reading &apos;items&apos;)
        </p>
        <p className="text-white/40"> at total (cart.ts:4:15)</p>
      </div>
    </div>
  );
}

function Tile({
  name,
  tag,
  tone,
  speaking = false,
  children,
}: {
  name: string;
  tag?: string;
  tone: string;
  speaking?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative grid aspect-video place-items-center rounded-[1.6cqi] bg-[#232328] ${
        speaking ? "ring-[0.3cqi] ring-[#a2e1b2] ring-inset" : ""
      }`}
    >
      <span
        className={`grid size-[5cqi] place-items-center rounded-full text-[1.8cqi] font-semibold ${tone}`}
      >
        {name[0]}
      </span>
      <span className="absolute bottom-[0.8cqi] left-[0.8cqi] rounded-full bg-black/50 px-[1cqi] py-[0.2cqi] text-[1.25cqi] font-medium text-white">
        {name}
        {tag ? <span className="text-white/55"> {tag}</span> : null}
      </span>
      {children}
    </div>
  );
}

function DockKey({
  children,
  tone = "bg-white/10 text-white/80",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`grid size-[4.4cqi] place-items-center rounded-full ${tone} [&_svg]:size-[2cqi]`}
    >
      {children}
    </span>
  );
}

/**
 * Bruno shares the failing file with sound, Ana points at the bug, raises her hand, reacts
 * and writes, and Iris joins through the link as a guest. Every element starts in its
 * final state, so the picture makes sense without JavaScript or with reduced motion.
 */
export function DemoWindow() {
  return (
    <figure className="@container overflow-hidden rounded-[2cqi] border border-white/12 bg-[#161618] text-white shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]">
      <figcaption className="sr-only">
        Prévia de uma sala do Nelcota: Bruno compartilha o editor com um erro e o som do computador,
        Ana aponta a linha com o bug, levanta a mão e escreve no chat, e Iris entra pelo link como
        convidada.
      </figcaption>
      <div aria-hidden="true" className="font-sans">
        <div className="flex items-center gap-[1.6cqi] border-b border-white/8 px-[2cqi] py-[1.4cqi] text-[1.4cqi]">
          <span className="flex gap-[0.8cqi]">
            <span className="size-[1.2cqi] rounded-full bg-white/15" />
            <span className="size-[1.2cqi] rounded-full bg-white/15" />
            <span className="size-[1.2cqi] rounded-full bg-white/15" />
          </span>
          <span className="rounded-full bg-white/8 px-[1.4cqi] py-[0.3cqi] text-white/70 tabular-nums">
            kfa-mtrx-q2p
          </span>
          <span className="inline-flex items-center gap-[0.6cqi] text-white/60">
            <span className="size-[0.9cqi] rounded-full bg-[#4ade80]" />
            Conectado
          </span>
          <span className="ml-auto text-white/50">3 pessoas</span>
        </div>

        <div className="grid grid-cols-[1fr_22%] gap-[1.6cqi] p-[1.6cqi]">
          <div
            data-demo="stage"
            className="relative aspect-[16/10] overflow-hidden rounded-[1.6cqi] bg-[#0d0d0f]"
          >
            <div data-demo="screen" className="absolute inset-0">
              <SharedEditor />
            </div>
            <span
              data-demo="guest"
              className="absolute top-[3%] right-[3%] inline-flex items-center gap-[0.8cqi] rounded-full bg-black/70 px-[1.4cqi] py-[0.5cqi] text-[1.35cqi] font-medium backdrop-blur"
            >
              <span className="size-[0.9cqi] rounded-full bg-[#4ade80]" />
              Iris (convidado) entrou na sala
            </span>
            <span
              data-demo="badge"
              className="absolute bottom-[22%] left-[3%] inline-flex items-center gap-[0.8cqi] rounded-full bg-black/70 px-[1.4cqi] py-[0.5cqi] text-[1.35cqi] font-medium backdrop-blur"
            >
              <Volume2 className="size-[1.8cqi] text-[#a2e1b2]" />
              Bruno · tela com som
              <span className="flex h-[1.6cqi] items-end gap-[0.3cqi]">
                <span
                  data-demo="level"
                  className="h-full w-[0.35cqi] origin-bottom rounded bg-[#a2e1b2]"
                />
                <span
                  data-demo="level"
                  className="h-2/3 w-[0.35cqi] origin-bottom rounded bg-[#a2e1b2]"
                />
                <span
                  data-demo="level"
                  className="h-full w-[0.35cqi] origin-bottom rounded bg-[#a2e1b2]"
                />
              </span>
            </span>
            <span
              data-demo="reaction"
              className="absolute right-[3%] bottom-[22%] grid size-[5cqi] place-items-center rounded-full bg-black/70 text-[2.6cqi] backdrop-blur"
            >
              👏
            </span>
          </div>

          <div className="flex flex-col gap-[1.6cqi]">
            <Tile name="Bruno" tone="bg-[#3b82f6] text-white" speaking />
            <Tile name="Ana" tone="bg-[#8b5cf6] text-white">
              <span
                data-demo="hand"
                className="absolute top-[0.8cqi] right-[0.8cqi] grid size-[3cqi] place-items-center rounded-full bg-[#fbbf24] text-black [&_svg]:size-[1.7cqi]"
              >
                <Hand />
              </span>
            </Tile>
            <Tile name="Iris" tag="(convidado)" tone="bg-[#a2e1b2] text-[#14281c]" />
          </div>
        </div>

        <div className="flex items-center gap-[1.6cqi] px-[1.6cqi] pb-[1.6cqi]">
          <span
            data-demo="chat"
            className="rounded-[1.6cqi] rounded-bl-[0.4cqi] bg-white/8 px-[1.6cqi] py-[0.8cqi] text-[1.4cqi]"
          >
            <span className="font-semibold text-[#c4a7ff]">Ana:</span> é o{" "}
            <code className="font-mono">cart</code> vindo vazio, né?
          </span>
          <div className="ml-auto flex gap-[1cqi]">
            <DockKey>
              <Mic />
            </DockKey>
            <DockKey tone="bg-[#a2e1b2] text-[#14281c]">
              <MonitorUp />
            </DockKey>
            <DockKey>
              <Hand />
            </DockKey>
            <DockKey>
              <MessageSquare />
            </DockKey>
            <DockKey tone="bg-[#f87171]/20 text-[#f87171]">
              <PhoneOff />
            </DockKey>
          </div>
        </div>
      </div>
    </figure>
  );
}
