import { Mic, MicOff, MonitorUp } from "lucide-react";
import type { ReactNode } from "react";

/** A participant tile of the demo window, with the room's microphone and presenter marks. */

/** Microphone state of a tile, as the room shows it in the corner. */
function TileMic({ state }: { state: "speaking" | "on" | "off" }) {
  if (state === "off") {
    return (
      <span className="absolute right-[0.8cqi] bottom-[0.8cqi] grid size-[2.6cqi] place-items-center rounded-full bg-[#f87171]/20 text-[#f87171] [&_svg]:size-[1.4cqi]">
        <MicOff />
      </span>
    );
  }
  if (state === "on") {
    return (
      <span className="absolute right-[0.8cqi] bottom-[0.8cqi] grid size-[2.6cqi] place-items-center rounded-full bg-black/50 text-white/70 [&_svg]:size-[1.4cqi]">
        <Mic />
      </span>
    );
  }
  return (
    <span className="absolute right-[0.8cqi] bottom-[0.8cqi] flex h-[2.6cqi] items-center gap-[0.3cqi] rounded-full bg-black/50 px-[0.8cqi]">
      {[60, 100, 45].map((height, index) => (
        <span
          key={index}
          data-demo="tile-level"
          style={{ height: `${height}%` }}
          className="w-[0.35cqi] origin-center rounded bg-[#a2e1b2]"
        />
      ))}
    </span>
  );
}

export function Tile({
  name,
  tag,
  tone,
  mic,
  presenting = false,
  demo,
  children,
}: {
  name: string;
  tag?: string;
  tone: string;
  mic: "speaking" | "on" | "off";
  presenting?: boolean;
  /** Hook for the scroll scene (a tile that arrives later). */
  demo?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-demo={demo}
      className={`relative grid aspect-video place-items-center rounded-[1.6cqi] bg-[#232328] ${
        mic === "speaking" ? "ring-[0.3cqi] ring-[#a2e1b2] ring-inset" : ""
      }`}
    >
      {presenting ? (
        <span className="absolute top-[0.8cqi] left-[0.8cqi] inline-flex items-center gap-[0.5cqi] rounded-full bg-[#a2e1b2]/15 px-[0.9cqi] py-[0.2cqi] text-[1.1cqi] font-medium text-[#a2e1b2] [&_svg]:size-[1.2cqi]">
          <MonitorUp />
          apresentando
        </span>
      ) : null}
      <TileMic state={mic} />
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
