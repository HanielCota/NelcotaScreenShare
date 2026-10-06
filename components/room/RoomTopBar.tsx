"use client";

import type { Participant } from "livekit-client";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { NavBar, NavBrand, NavDivider, NavPopover, ShortcutsPanel } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { roomPath } from "@/lib/livekit";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "?"}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

function displayName(participant: Participant): string {
  return participant.name || participant.identity;
}

/** "Sala abc-defg-hij" que copia o link; a confirmação aparece no próprio botão. */
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
          .catch(() => setCopied(false));
      }}
      aria-label={`Sala ${code}. Copiar link para convidar`}
      className="group flex h-10 min-w-0 items-center gap-2 rounded-xl px-3 transition-colors hover:bg-surface-3"
    >
      <span className="truncate text-base font-semibold tracking-tight">
        <span className="font-normal text-ink-muted max-sm:hidden">Sala </span>
        <span className="font-mono">{code}</span>
      </span>
      {copied ? (
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success">
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

/** Avatares empilhados + "N pessoas"; ao tocar, a lista e o limite da sala. */
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
                className="grid size-8 place-items-center rounded-full bg-brand/20 text-sm font-bold text-brand-soft ring-2 ring-surface"
              >
                {initials(displayName(participant))}
              </span>
            ))}
          </span>
          <span className="text-sm font-semibold text-ink">
            {count === 1 ? "1 pessoa" : `${count} pessoas`}
          </span>
        </>
      }
    >
      <p className="text-base font-semibold tracking-tight">Na sala agora</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {participants.map((participant) => (
          <li key={participant.identity} className="flex items-center gap-3 text-base">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-bold text-brand-soft"
            >
              {initials(displayName(participant))}
            </span>
            <span className="truncate">
              {displayName(participant)}
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

/**
 * Barra do topo da sala, enxuta: a sala (copia o link), um ponto de conexão,
 * quem está dentro e um "⋯" com atalhos e tema.
 */
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
      {/* Só um ponto: verde conectado, amarelo pulsando enquanto reconecta (o
          aviso escrito aparece no meio da tela). */}
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
          <span className="text-base font-semibold">Tema claro ou escuro</span>
          <ThemeToggle />
        </div>
        <div className="mt-4 border-t border-line pt-4 max-sm:hidden">
          <ShortcutsPanel />
        </div>
      </NavPopover>
    </NavBar>
  );
}
