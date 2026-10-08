import { UserAvatar } from "@/components/UserAvatar";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { presenceText } from "@/features/room/domain/join";
import type { RoomPresence } from "@/features/room/domain/presence";
import { cn } from "@/lib/utils";

export function PresenceLine({ presence, max }: { presence: RoomPresence | null; max: number }) {
  if (!presence) return null;
  const line = presenceText(presence.online, max);
  if (line.kind === "empty") return <p className="text-base text-ink-muted">{line.text}</p>;
  const shown = presence.participants.slice(0, 5);
  const remaining = presence.online - shown.length;
  const names = presence.participants.map((participant) => participant.name).join(", ");
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {shown.length > 0 ? (
        <>
          <AvatarGroup aria-hidden="true" title={names}>
            {shown.map((participant) => (
              <UserAvatar key={participant.id} image={participant.image} />
            ))}
            {remaining > 0 ? <AvatarGroupCount>+{remaining}</AvatarGroupCount> : null}
          </AvatarGroup>
          <span className="sr-only">Pessoas na sala: {names}.</span>
        </>
      ) : null}
      <p
        className={cn(
          "inline-flex items-center gap-2 text-base font-medium",
          line.kind === "full" ? "text-warning" : "text-ink",
        )}
      >
        {line.kind === "some" ? (
          <span className="relative flex size-2 shrink-0" aria-hidden="true">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
        ) : null}
        {line.text}
      </p>
    </div>
  );
}
