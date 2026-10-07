/** Mascot speech bubble on the access screens. */
export function BubbleText({ text }: { text: string }) {
  return (
    <p className="relative max-w-64 rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-snug lg:max-w-72 lg:text-base">
      {text}
      {/* Bubble tail: points at the mascot (to the left on mobile, below on desktop). */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-line bg-surface lg:top-auto lg:-bottom-1.5 lg:left-10 lg:translate-y-0 lg:border-t-0 lg:border-r lg:border-b lg:border-l-0"
      />
    </p>
  );
}
