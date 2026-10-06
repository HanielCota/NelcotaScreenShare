"use client";

import {
  useAudioPlayback,
  useConnectionState,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track, type Participant } from "livekit-client";
import { Loader2, Volume2, WifiOff } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { pickFocusedShare } from "@/features/room/domain/focus";
import { useRoomAnimations } from "@/features/room/hooks/use-room-animations";
import { useRoomNotices } from "@/features/room/hooks/use-room-notices";
import { useScreenShare } from "@/features/room/hooks/use-screen-share";
import { ChatPanel, useChatState } from "@/features/room/ui/dock/Chat";
import { ControlDock } from "@/features/room/ui/dock/ControlDock";
import { ScreenStage } from "@/features/room/ui/stage/ScreenStage";
import { cn } from "@/lib/utils";
import { AloneWelcome } from "./AloneWelcome";
import { ParticipantTile } from "./ParticipantTile";
import { RoomTopBar } from "./RoomTopBar";

type Connection = "connecting" | "reconnecting" | "connected";

function connectionStatus(state: ConnectionState): Connection {
  if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) {
    return "reconnecting";
  }
  return state === ConnectionState.Connecting ? "connecting" : "connected";
}

/** Avisos empilhados: reconexão e áudio bloqueado podem aparecer juntos. */
function ConnectionNotices({ connection }: { connection: Connection }) {
  const { canPlayAudio, startAudio } = useAudioPlayback();
  const reconnecting = connection === "reconnecting";
  return (
    <div className="absolute top-20 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {connection !== "connected" ? (
        <output aria-live="polite">
          <span className="glass flex items-center gap-2.5 rounded-full px-5 py-3 text-base font-semibold">
            <Mascot className="size-14" sizes="168px" canSleep={false} activity="waiting" />
            {reconnecting ? <WifiOff className="size-5 text-warning" aria-hidden="true" /> : null}
            <Loader2 className="size-5 animate-spin text-ink-muted" aria-hidden="true" />
            {reconnecting ? "Conexão instável. Reconectando…" : "Conectando…"}
          </span>
        </output>
      ) : null}
      {!canPlayAudio ? (
        <Button onClick={() => void startAudio()} size="lg">
          <Volume2 aria-hidden="true" />
          Ativar áudio da sala
        </Button>
      ) : null}
    </div>
  );
}

/** Pessoas: grade sem palco; com palco, uma faixa ao lado com o mascote "apresentando". */
function PeopleArea({
  participants,
  sharingIds,
  hasStage,
  busy,
}: {
  participants: Participant[];
  sharingIds: Set<string>;
  hasStage: boolean;
  /** Conectando ou reconectando: o mascote espera em vez de apresentar. */
  busy: boolean;
}) {
  return (
    <div
      className={cn(
        hasStage
          ? "flex shrink-0 gap-3 overflow-x-auto p-1 lg:w-48 lg:flex-col lg:gap-4 lg:overflow-x-visible lg:overflow-y-auto"
          : "grid w-full max-w-5xl content-center gap-4",
        !hasStage && participants.length <= 2 && "max-w-4xl grid-cols-1 sm:grid-cols-2",
        !hasStage && participants.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {hasStage ? (
        <div className="flex shrink-0 items-center justify-center self-center">
          <Mascot
            className="size-20"
            sizes="240px"
            canSleep={false}
            activity={busy ? "waiting" : "presenting"}
          />
        </div>
      ) : null}
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.identity}
          participant={participant}
          isSharing={sharingIds.has(participant.identity)}
          compact={hasStage}
        />
      ))}
    </div>
  );
}

/** A sala conectada: barra do topo, palco (tela em foco), pessoas, chat e controles. */
export function RoomLayout({
  code,
  maxParticipants,
  onLeave,
}: {
  code: string;
  maxParticipants: number;
  onLeave: () => void;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const connectionState = useConnectionState();
  const participants = useParticipants();
  // Só entra no palco depois que o vídeo está disponível (evita palco preto).
  const screenShares = useTracks([Track.Source.ScreenShare]).filter(
    (ref) => ref.publication.track !== undefined,
  );
  const [focusedSid, setFocusedSid] = useState<string>();
  const chat = useChatState();
  const share = useScreenShare();
  useRoomNotices();

  const focused = pickFocusedShare(screenShares, focusedSid);
  const hasStage = focused !== undefined;
  const sharingIds = new Set(screenShares.map((ref) => ref.participant.identity));

  const connection = connectionStatus(connectionState);
  const alone =
    !hasStage && participants.length === 1 && connectionState === ConnectionState.Connected;

  const layoutKey = `${hasStage ? "stage" : alone ? "alone" : "grid"}|${participants.map((p) => p.identity).join(",")}`;
  useRoomAnimations(scope, layoutKey);

  return (
    <div ref={scope} className="relative flex h-dvh flex-col overflow-hidden bg-canvas">
      <header data-anim="topbar" className="relative z-20 px-3 pt-3 sm:px-6 sm:pt-4">
        <RoomTopBar
          code={code}
          participants={participants}
          maxParticipants={maxParticipants}
          connection={connection}
        />
      </header>

      <ConnectionNotices connection={connection} />

      <main
        className={cn(
          "relative z-10 flex min-h-0 flex-1 gap-4 px-3 pt-4 pb-32 sm:px-6",
          hasStage ? "flex-col lg:flex-row" : "flex-col items-center justify-center",
          // Chat aberto em tela larga: o conteúdo abre espaço em vez de ficar por baixo.
          chat.open && "lg:pr-[26.5rem]",
        )}
      >
        {focused ? (
          <ScreenStage shares={screenShares} focused={focused} onFocus={setFocusedSid} />
        ) : null}

        {alone ? (
          <AloneWelcome code={code} share={share} />
        ) : (
          <PeopleArea
            participants={participants}
            sharingIds={sharingIds}
            hasStage={hasStage}
            busy={connection !== "connected"}
          />
        )}
      </main>

      {chat.open ? <ChatPanel chat={chat} /> : null}
      <ControlDock chat={chat} share={share} onLeave={onLeave} />
    </div>
  );
}
