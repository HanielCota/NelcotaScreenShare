import { Clock, Hand, MessageSquare, Mic, MonitorUp, PhoneOff, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { SharedEditor } from "./DemoEditor";
import { Tile } from "./DemoTile";
import { WindowDots } from "./RoomChrome";

/**
 * A miniature of a real call, drawn with a fixed dark palette (the room's own look, the
 * same in both themes). Sizes use container units, so it scales like a picture.
 */

function DockKey({
  children,
  tone = "bg-white/10 text-white/80",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`grid size-[4.4cqi] place-items-center rounded-full ${tone} @max-xl:size-[7cqi] [&_svg]:size-[2cqi] @max-xl:[&_svg]:size-[3.4cqi]`}
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
    <figure className="@container overflow-hidden rounded-2xl border border-white/12 bg-[#161618] text-white shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]">
      <figcaption className="sr-only">
        Prévia de uma sala do Nelcota: Bruno compartilha o editor com um erro e o som do computador,
        Ana aponta a linha com o bug, levanta a mão e escreve no chat, e Iris entra pelo link como
        convidada.
      </figcaption>
      <div aria-hidden="true" className="font-sans">
        <div className="flex items-center gap-[1.6cqi] border-b border-white/8 px-[2cqi] py-[1.4cqi] text-[1.4cqi] @max-xl:text-[2.6cqi]">
          <WindowDots className="gap-[0.8cqi]" dot="size-[1.2cqi]" />
          <span className="rounded-full bg-white/8 px-[1.4cqi] py-[0.3cqi] text-white/70 tabular-nums">
            kfa-mtrx-q2p
          </span>
          <span className="inline-flex items-center gap-[0.6cqi] text-white/60">
            <span className="size-[0.9cqi] rounded-full bg-[#4ade80]" />
            Conectado
          </span>
          {/* Two people until Iris joins; the scene swaps them, the static picture shows three. */}
          <span className="ml-auto inline-grid text-white/50 tabular-nums">
            <span data-demo="count-before" className="opacity-0 [grid-area:1/1]">
              2 pessoas
            </span>
            <span data-demo="count-after" className="[grid-area:1/1]">
              3 pessoas
            </span>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_22%] gap-[1.6cqi] p-[1.6cqi] @max-xl:grid-cols-1">
          <div
            data-demo="stage"
            className="relative aspect-[16/10] overflow-hidden rounded-[1.6cqi] bg-[#0d0d0f]"
          >
            <div data-demo="screen" className="absolute inset-0">
              <SharedEditor />
            </div>
            <span
              data-demo="guest"
              className="absolute top-[3%] right-[3%] inline-flex items-center gap-[0.8cqi] rounded-full bg-black/70 px-[1.4cqi] py-[0.5cqi] text-[1.35cqi] font-medium backdrop-blur @max-xl:text-[2.4cqi]"
            >
              <span className="size-[0.9cqi] rounded-full bg-[#4ade80]" />
              Iris (convidado) entrou na sala
            </span>
            <span
              data-demo="badge"
              className="absolute bottom-[22%] left-[3%] inline-flex items-center gap-[0.8cqi] rounded-full bg-black/70 px-[1.4cqi] py-[0.5cqi] text-[1.35cqi] font-medium backdrop-blur @max-xl:text-[2.4cqi]"
            >
              <Volume2 className="size-[1.8cqi] text-[#a2e1b2]" />
              Tela de Bruno · com som
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

          <div className="flex flex-col gap-[1.6cqi] @max-xl:hidden">
            <Tile name="Bruno" tone="bg-[#3b82f6] text-white" mic="speaking" presenting />
            <Tile name="Ana" tone="bg-[#8b5cf6] text-white" mic="on">
              <span
                data-demo="hand"
                className="absolute top-[0.8cqi] right-[0.8cqi] grid size-[3cqi] place-items-center rounded-full bg-[#fbbf24] text-black [&_svg]:size-[1.7cqi]"
              >
                <Hand />
              </span>
            </Tile>
            <Tile
              name="Iris"
              tag="(convidado)"
              tone="bg-[#a2e1b2] text-[#14281c]"
              mic="off"
              demo="iris"
            />
          </div>
        </div>

        <div className="flex items-center gap-[1.6cqi] px-[1.6cqi] pb-[1.6cqi]">
          <span className="inline-flex items-center gap-[0.6cqi] text-[1.3cqi] text-white/50 tabular-nums @max-xl:hidden [&_svg]:size-[1.5cqi]">
            <Clock />
            12:04
          </span>
          <span
            data-demo="chat"
            className="rounded-[1.6cqi] rounded-bl-[0.4cqi] bg-white/8 px-[1.6cqi] py-[0.8cqi] text-[1.4cqi] @max-xl:text-[2.6cqi]"
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
