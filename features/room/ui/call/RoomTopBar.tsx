import type { Participant } from "livekit-client";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  NavBar,
  NavBrand,
  NavDivider,
  NavPopover,
  ShortcutsPanel,
} from "@/components/shell/NavBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { roomPath } from "@/features/room/domain/room-code";
import { participantName } from "@/features/room/domain/participant-label";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

/** "Sala abc-defg-hij" that copies the link; the confirmation appears on the button itself. */
function RoomCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          .writeText(`${window.location.origin}${roomPath(code)}`)
          .then(() => setCopied(true))
          .catch(() => toast.error("Não foi possível copiar o link. Tente de novo."));
      }}
      aria-label={`Sala ${code}. Copiar link para convidar`}
      className="group flex h-10 min-w-0 items-center gap-2 rounded-xl px-3 transition-colors hover:bg-surface-3"
    >
      <span className="truncate text-base font-medium tracking-tight">
        <span className="font-normal text-ink-muted max-sm:hidden">Sala </span>
        <span className="font-sans tabular-nums">{code}</span>
      </span>
      {copied ? (
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-success">
          <Check className="size-4" aria-hidden="true" />
          <span className="max-sm:sr-only">Copiado</span>
        </span>
      ) : (
        <Copy
          className="size-4 shrink-0 text-ink-muted transition-colors group-hover:text-ink"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

/** Stacked avatars + "N pessoas"; on tap, the list and the room limit. */
function PeopleButton({ participants, max }: { participants: Participant[]; max: number }) {
  const shown = participants.slice(0, 3);
  const count = participants.length;
  return (
    <NavPopover
      label="Pessoas na sala"
      align="end"
      trigger={
        <>
          <span className="flex -space-x-2" aria-hidden="true">
            {shown.map((participant) => (
              <span
                key={participant.identity}
                className="grid size-8 place-items-center rounded-full bg-brand/20 text-sm font-medium text-brand-soft ring-2 ring-surface"
              >
                {initials(participantName(participant))}
              </span>
            ))}
          </span>
          <span className="text-sm font-medium text-ink">
            {count === 1 ? "1 pessoa" : `${count} pessoas`}
          </span>
        </>
      }
    >
      <p className="text-base font-medium tracking-tight">Na sala agora</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {participants.map((participant) => (
          <li key={participant.identity} className="flex items-center gap-3 text-base">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-medium text-brand-soft"
            >
              {initials(participantName(participant))}
            </span>
            <span className="truncate">
              {participantName(participant)}
              {participant.isLocal ? <span className="text-ink-muted"> (você)</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">
        Cabem até {max} pessoas nesta sala.
      </p>
    </NavPopover>
  );
}

/** Room link, connection state, participants, shortcuts and theme. */
export function RoomTopBar({
  code,
  participants,
  maxParticipants,
  connection,
}: {
  code: string;
  participants: Participant[];
  maxParticipants: number;
  connection: "connected" | "connecting" | "reconnecting";
}) {
  return (
    <NavBar aria-label="Sala" className="mx-auto max-w-5xl">
      <NavBrand showName={false} className="max-sm:hidden" />
      <NavDivider className="max-sm:hidden" />
      <RoomCodeButton code={code} />
      {/* Just a dot: green when connected, pulsing yellow while reconnecting (the
          written notice appears in the middle of the screen). */}
      <span className="flex shrink-0 items-center">
        <span
          aria-hidden="true"
          className={cn(
            "size-2.5 rounded-full",
            connection === "connected" ? "bg-success" : "animate-pulse bg-warning",
          )}
        />
        <span className="sr-only">{connection === "connected" ? "Conectado" : "Reconectando"}</span>
      </span>

      <span className="ml-auto" />
      <PeopleButton participants={participants} max={maxParticipants} />
      <NavPopover
        label="Mais opções"
        iconOnly
        align="end"
        trigger={<MoreHorizontal className="size-5" aria-hidden="true" />}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-medium">Tema claro ou escuro</span>
          <ThemeToggle />
        </div>
        <div className="mt-4 border-t border-line pt-4 max-sm:hidden">
          <ShortcutsPanel />
        </div>
      </NavPopover>
    </NavBar>
  );
}
