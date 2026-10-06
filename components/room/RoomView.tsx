"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  useAudioPlayback,
  useConnectionState,
  useParticipants,
  useSequentialRoomConnectDisconnect,
  useTracks,
} from "@livekit/components-react";
import {
  ConnectionError,
  ConnectionErrorReason,
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import {
  AlertTriangle,
  Copy,
  Link2,
  Loader2,
  RotateCcw,
  Users,
  Volume2,
  WifiOff,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { useRoomAnimations } from "@/hooks/useRoomAnimations";
import { copyRoomLink } from "@/lib/copy-room-link";
import { cn } from "@/lib/utils";
import { ChatPanel, useChatState } from "./Chat";
import { ControlDock } from "./ControlDock";
import { ParticipantTile } from "./ParticipantTile";
import type { JoinChoices } from "./PreJoin";
import { ReactionsProvider } from "./Reactions";
import { ScreenStage } from "./ScreenStage";
import { StatusScreen } from "./StatusScreen";

interface RoomViewProps {
  code: string;
  choices: JoinChoices;
  maxParticipants: number;
  onLeave: (message?: string) => void;
  onRetry: () => Promise<void>;
}

function connectErrorMessage(error: unknown): string {
  if (error instanceof ConnectionError) {
    // O LiveKit não tem um reason próprio para sala cheia: só a mensagem diz.
    // Acontece quando duas pessoas passam pela checagem do /api/token juntas.
    if (/full/i.test(error.message))
      return "A sala está cheia. Aguarde alguém sair e tente de novo.";
    switch (error.reason) {
      case ConnectionErrorReason.NotAllowed:
        return "Não foi possível autorizar sua entrada. Toque em Tentar de novo para renovar o acesso.";
      case ConnectionErrorReason.ServerUnreachable:
      case ConnectionErrorReason.WebSocket:
        return "Não foi possível conectar à sala. Verifique sua internet e tente de novo.";
      case ConnectionErrorReason.Timeout:
        return "A conexão demorou mais que o esperado. Tente de novo; se continuar, tente usar outra rede.";
      default:
        break;
    }
  }
  return "Não foi possível conectar à sala. Aguarde alguns segundos e tente de novo.";
}

function disconnectMessage(reason: DisconnectReason | undefined): string | undefined {
  switch (reason) {
    case DisconnectReason.PARTICIPANT_REMOVED:
      return "Você foi removido da sala. Fale com quem enviou o convite antes de entrar de novo.";
    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
      return "A sala foi encerrada. Volte ao início para criar uma nova sala.";
    case DisconnectReason.SERVER_SHUTDOWN:
      return "A sala ficou indisponível por um instante. Aguarde alguns segundos e entre de novo.";
    case DisconnectReason.JOIN_FAILURE:
    case DisconnectReason.SIGNAL_CLOSE:
    case DisconnectReason.CONNECTION_TIMEOUT:
      return "A conexão caiu. Verifique sua internet e toque em Entrar de novo.";
    default:
      return undefined;
  }
}

export function RoomView({ code, choices, maxParticipants, onLeave, onRetry }: RoomViewProps) {
  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          deviceId: choices.audioDeviceId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }),
  );
  const { connect, disconnect } = useSequentialRoomConnectDisconnect(room);
  const [connectError, setConnectError] = useState<string>();
  const [retrying, setRetrying] = useState(false);
  const leavingRef = useRef(false);

  const handleUnexpectedDisconnect = useEffectEvent((reason?: DisconnectReason) => {
    if (leavingRef.current || reason === DisconnectReason.CLIENT_INITIATED) return;
    onLeave(
      disconnectMessage(reason) ?? "Você foi desconectado. Verifique sua internet e entre de novo.",
    );
  });

  useEffect(() => {
    let cancelled = false;

    const handleDisconnected = (reason?: DisconnectReason) => {
      if (!cancelled) handleUnexpectedDisconnect(reason);
    };
    const handleReconnected = () => toast.success("Conexão restabelecida.");
    const handleMediaError = () =>
      toast.error(
        "Não foi possível usar o microfone. Confira as permissões deste site e tente ligá-lo de novo.",
      );

    room
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.Reconnected, handleReconnected)
      .on(RoomEvent.MediaDevicesError, handleMediaError);

    const run = async () => {
      setConnectError(undefined);
      try {
        await connect(choices.serverUrl, choices.token);
        if (cancelled) return;
        if (choices.micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true).catch(() => {
            toast.error(
              "Você entrou com o microfone desligado. Confira as permissões deste site e tente ligá-lo nos controles da sala.",
            );
          });
        }
      } catch (error) {
        if (!cancelled) setConnectError(connectErrorMessage(error));
      }
    };
    void run();

    return () => {
      cancelled = true;
      room
        .off(RoomEvent.Disconnected, handleDisconnected)
        .off(RoomEvent.Reconnected, handleReconnected)
        .off(RoomEvent.MediaDevicesError, handleMediaError);
      void disconnect();
    };
  }, [room, connect, disconnect, choices]);

  function leave() {
    leavingRef.current = true;
    void disconnect().finally(() => onLeave());
  }

  if (connectError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <StatusScreen
          icon={AlertTriangle}
          tone="danger"
          title="Não deu para conectar"
          message={connectError}
          alert
        >
          <Button
            size="lg"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              void onRetry().finally(() => setRetrying(false));
            }}
          >
            {retrying ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw aria-hidden="true" />
            )}
            Tentar de novo
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onLeave("Não foi possível conectar. Tente entrar novamente.")}
          >
            Voltar
          </Button>
        </StatusScreen>
      </main>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <ReactionsProvider>
        <RoomLayout code={code} maxParticipants={maxParticipants} onLeave={leave} />
      </ReactionsProvider>
      <RoomAudioRenderer />
    </RoomContext.Provider>
  );
}

function RoomLayout({
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
  const { canPlayAudio, startAudio } = useAudioPlayback();
  // Só entra no palco depois que o vídeo está disponível (evita palco preto).
  const screenShares = useTracks([Track.Source.ScreenShare]).filter(
    (ref) => ref.publication.track !== undefined,
  );
  const [focusedSid, setFocusedSid] = useState<string>();
  const chat = useChatState();

  // Palco: a tela escolhida, senão a mais recente dos outros. A sua só entra
  // quando é a única (e o palco mostra uma prévia pequena, sem efeito espelho).
  const focused =
    screenShares.find((ref) => ref.publication.trackSid === focusedSid) ??
    screenShares.findLast((ref) => !ref.participant.isLocal) ??
    screenShares.at(-1);
  const hasStage = focused !== undefined;
  const sharingIds = new Set(screenShares.map((ref) => ref.participant.identity));

  const layoutKey = `${hasStage ? "stage" : "grid"}|${participants.map((p) => p.identity).join(",")}`;
  useRoomAnimations(scope, layoutKey);

  const reconnecting =
    connectionState === ConnectionState.Reconnecting ||
    connectionState === ConnectionState.SignalReconnecting;
  const connecting = connectionState === ConnectionState.Connecting;
  const alone =
    !hasStage && participants.length === 1 && connectionState === ConnectionState.Connected;

  return (
    <div ref={scope} className="relative flex h-dvh flex-col overflow-hidden bg-canvas">
      <header
        data-anim="topbar"
        className="relative z-20 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6"
      >
        <button
          type="button"
          onClick={() => void copyRoomLink(code)}
          aria-label={`Sala ${code}. Copiar link`}
          className="glass group flex min-w-0 items-center gap-3 rounded-2xl px-4 py-2.5 transition-colors hover:bg-surface-2/80"
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              reconnecting || connecting ? "bg-warning" : "bg-success",
            )}
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold tracking-tight">
            <span className="text-ink-subtle">Sala </span>
            {code}
          </span>
          <Copy
            className="size-3.5 shrink-0 text-ink-subtle transition-colors group-hover:text-ink"
            aria-hidden="true"
          />
        </button>
        <div
          className="glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold"
          aria-label={`${participants.length} de ${maxParticipants} participantes`}
        >
          <Users className="size-4 text-brand-soft" aria-hidden="true" />
          {participants.length}
          <span className="text-ink-subtle">/ {maxParticipants}</span>
        </div>
      </header>

      {/* Avisos empilhados: reconexão e áudio bloqueado podem aparecer juntos. */}
      <div className="absolute top-20 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
        {reconnecting || connecting ? (
          <output aria-live="polite">
            <span className="glass flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold">
              {reconnecting ? <WifiOff className="size-4 text-warning" aria-hidden="true" /> : null}
              <Loader2 className="size-4 animate-spin text-ink-muted" aria-hidden="true" />
              {reconnecting ? "Conexão instável. Reconectando…" : "Conectando…"}
            </span>
          </output>
        ) : null}
        {!canPlayAudio ? (
          <Button onClick={() => void startAudio()} className="h-10 rounded-xl px-3.5">
            <Volume2 aria-hidden="true" />
            Ativar áudio da sala
          </Button>
        ) : null}
      </div>

      <main
        className={cn(
          "relative z-10 flex min-h-0 flex-1 gap-4 px-4 pt-4 pb-28 sm:px-6",
          hasStage ? "flex-col lg:flex-row" : "flex-col items-center justify-center",
          // Chat aberto em tela larga: o conteúdo abre espaço em vez de ficar por baixo.
          chat.open && "lg:pr-[24.5rem]",
        )}
      >
        {focused ? (
          <ScreenStage shares={screenShares} focused={focused} onFocus={setFocusedSid} />
        ) : null}

        <div
          className={cn(
            hasStage
              ? "flex shrink-0 gap-3 overflow-x-auto pb-1 lg:w-64 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
              : "grid w-full max-w-5xl content-center gap-4",
            !hasStage && participants.length === 1 && "max-w-md grid-cols-1",
            !hasStage && participants.length === 2 && "grid-cols-1 sm:grid-cols-2",
            !hasStage && participants.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {participants.map((participant) => (
            <ParticipantTile
              key={participant.identity}
              participant={participant}
              isSharing={sharingIds.has(participant.identity)}
              compact={hasStage}
            />
          ))}
        </div>

        {alone ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot className="size-20" sizes="240px" canSleep={false} />
            <p className="text-sm text-ink-subtle">Só você por aqui. Mande o link para o time.</p>
            <Button
              variant="outline"
              onClick={() => void copyRoomLink(code)}
              className="h-10 rounded-xl px-3.5"
            >
              <Link2 aria-hidden="true" />
              Copiar link da sala
            </Button>
          </div>
        ) : null}
      </main>

      {chat.open ? <ChatPanel chat={chat} /> : null}
      <ControlDock code={code} chat={chat} onLeave={onLeave} />
    </div>
  );
}
