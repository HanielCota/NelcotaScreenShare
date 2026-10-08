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

/** The three dots at the start of a window's title bar. */
export function WindowDots({ className, dot }: { className: string; dot: string }) {
  return (
    <span className={`flex ${className}`}>
      <span className={`rounded-full bg-white/15 ${dot}`} />
      <span className={`rounded-full bg-white/15 ${dot}`} />
      <span className={`rounded-full bg-white/15 ${dot}`} />
    </span>
  );
}
