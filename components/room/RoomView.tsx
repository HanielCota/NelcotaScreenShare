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
import { AlertTriangle, Loader2, MonitorUp, RotateCcw, Volume2, WifiOff } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { useRoomAnimations } from "@/hooks/useRoomAnimations";
import { canShareScreen } from "@/lib/share-support";
import { cn } from "@/lib/utils";
import { ChatPanel, useChatState } from "./Chat";
import { ControlDock } from "./ControlDock";
import { ParticipantTile } from "./ParticipantTile";
import type { JoinChoices } from "./PreJoin";
import { InviteLinkButton } from "./prejoin/InviteLinkButton";
import { ReactionsProvider } from "./Reactions";
import { RoomTopBar } from "./RoomTopBar";
import { ScreenStage } from "./ScreenStage";
import { StatusScreen } from "./StatusScreen";
import { useRoomNotices } from "./use-room-notices";
import { useScreenShare } from "./use-screen-share";

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
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "Você entrou nesta sala em outra aba ou dispositivo, então esta conexão foi encerrada.";
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
  useRoomNotices();

  // Palco: a tela escolhida, senão a mais recente dos outros. A sua só entra
  // quando é a única (e o palco mostra uma prévia pequena, sem efeito espelho).
  const focused =
    screenShares.find((ref) => ref.publication.trackSid === focusedSid) ??
    screenShares.findLast((ref) => !ref.participant.isLocal) ??
    screenShares.at(-1);
  const hasStage = focused !== undefined;
  const sharingIds = new Set(screenShares.map((ref) => ref.participant.identity));

  const reconnecting =
    connectionState === ConnectionState.Reconnecting ||
    connectionState === ConnectionState.SignalReconnecting;
  const connecting = connectionState === ConnectionState.Connecting;
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
          connection={reconnecting ? "reconnecting" : connecting ? "connecting" : "connected"}
        />
      </header>

      {/* Avisos empilhados: reconexão e áudio bloqueado podem aparecer juntos. */}
      <div className="absolute top-20 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
        {reconnecting || connecting ? (
          <output aria-live="polite">
            <span className="glass flex items-center gap-2.5 rounded-full px-5 py-3 text-base font-semibold">
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
          <AloneWelcome code={code} />
        ) : (
          <div
            className={cn(
              hasStage
                ? "flex shrink-0 gap-3 overflow-x-auto p-1 lg:w-48 lg:flex-col lg:gap-4 lg:overflow-x-visible lg:overflow-y-auto"
                : "grid w-full max-w-5xl content-center gap-4",
              !hasStage && participants.length <= 2 && "max-w-4xl grid-cols-1 sm:grid-cols-2",
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
        )}
      </main>

      {chat.open ? <ChatPanel chat={chat} /> : null}
      <ControlDock chat={chat} onLeave={onLeave} />
    </div>
  );
}

/**
 * Sozinho na sala: em vez de um bloco vazio, as duas coisas que importam
 * agora (mostrar a tela e chamar o time), grandes e com nome.
 */
function AloneWelcome({ code }: { code: string }) {
  const share = useScreenShare();
  const shareSupported = canShareScreen();

  return (
    <section
      data-flip-id="alone"
      aria-labelledby="alone-title"
      className="flex max-w-lg flex-col items-center gap-5 text-center"
    >
      <Mascot className="size-28" sizes="336px" canSleep={false} />
      <div className="flex flex-col gap-2">
        <h1 id="alone-title" className="text-3xl font-semibold tracking-tight text-balance">
          Você é a primeira pessoa aqui
        </h1>
        <p className="text-lg text-pretty text-ink-muted">
          {shareSupported
            ? "Mostre sua tela agora ou chame o time para entrar."
            : "Chame o time para entrar. Para mostrar sua tela, use o Chrome, Edge ou Firefox no computador."}
        </p>
      </div>
      <div className="apple-buttons flex flex-wrap items-center justify-center gap-3">
        {shareSupported ? (
          <Button
            size="lg"
            disabled={share.busy}
            onClick={() => void share.start({ surface: "monitor", audio: true })}
          >
            {share.busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <MonitorUp aria-hidden="true" />
            )}
            Compartilhar minha tela
          </Button>
        ) : null}
        <InviteLinkButton code={code} />
      </div>
    </section>
  );
}
