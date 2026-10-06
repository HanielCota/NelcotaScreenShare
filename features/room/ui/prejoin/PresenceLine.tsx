import { presenceText } from "@/features/room/domain/join";

/** "Quem já está lá dentro": responde "estou no lugar certo? já começou?". */
export function PresenceLine({
  presence,
  max,
}: {
  presence: { online: number } | null;
  max: number;
}) {
  if (!presence) return null;
  const line = presenceText(presence.online, max);
  if (line.kind === "full") {
    return <p className="text-base font-medium text-warning">{line.text}</p>;
  }
  if (line.kind === "empty") return <p className="text-base text-ink-muted">{line.text}</p>;
  return (
    <p className="inline-flex items-center gap-2 text-base font-semibold text-ink">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      {line.text}
    </p>
  );
}
