/** Pieces of the room's look shared by the demo window and the use-case drawings. */

/** Someone's pointer arrow, as the room draws it. */
export function PointerArrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`text-[#8b5cf6] drop-shadow ${className}`}>
      <path
        d="M2 1.5 13.5 7 8 8.4 5.6 14z"
        fill="currentColor"
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** macOS window controls: close, minimize and zoom, in their system colors. */
const TRAFFIC_LIGHTS = ["bg-[#ff5f57]", "bg-[#febc2e]", "bg-[#28c840]"];

/** The three dots at the start of a window's title bar, colored like a Mac window's. */
export function WindowDots({ className, dot }: { className: string; dot: string }) {
  return (
    <span className={`flex ${className}`}>
      {TRAFFIC_LIGHTS.map((color) => (
        <span key={color} className={`rounded-full ${color} ${dot}`} />
      ))}
    </span>
  );
}
