import { PointerArrow } from "./RoomChrome";

/** The file Bruno shares in the demo window: an editor with the bug and the error. */

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
      <PointerArrow className="size-[2.6cqi] @max-xl:size-[4.4cqi]" />
      <span className="mt-[2cqi] rounded-full bg-[#8b5cf6] px-[1.2cqi] py-[0.3cqi] font-sans text-[1.5cqi] font-semibold text-white @max-xl:text-[2.6cqi]">
        Ana
      </span>
    </span>
  );
}

function CodeLine({ tokens, number }: { tokens: Token[]; number: number }) {
  return (
    <div className="flex gap-[3cqi] whitespace-pre">
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
export function SharedEditor() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#1b1b1f] font-mono text-[1.75cqi] leading-[1.7] text-[#e6e6ea] @max-xl:text-[2.7cqi]">
      <div className="flex border-b border-white/8 font-sans text-[1.4cqi] @max-xl:text-[2.4cqi]">
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
        className="border-t border-white/8 bg-[#141417] px-[2cqi] py-[1.2cqi] text-[1.4cqi] leading-[1.6] @max-xl:text-[2.2cqi]"
      >
        <p className="text-[#ff8a8a]">
          TypeError: Cannot read properties of undefined (reading &apos;items&apos;)
        </p>
        <p className="text-white/40"> at total (cart.ts:4:15)</p>
      </div>
    </div>
  );
}
