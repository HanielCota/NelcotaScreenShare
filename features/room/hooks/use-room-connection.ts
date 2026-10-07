"use client";

import { useSequentialRoomConnectDisconnect } from "@livekit/components-react";
import { DisconnectReason, Room, RoomEvent } from "livekit-client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { connectErrorMessage, disconnectMessage } from "@/features/room/client/connection-errors";
import type { JoinChoices } from "@/features/room/domain/join";
import { MIC_ERROR_TOAST } from "@/features/room/client/toast-ids";

/**
 * Ciclo de vida da conexão com a sala: cria o Room, conecta, liga o microfone
 * pedido, avisa reconexão e quedas, e desconecta ao sair ou desmontar.
 * `connectError`: a conexão nem abriu (a tela oferece "Tentar de novo").
 */
export function useRoomConnection(
  choices: JoinChoices,
  onLeave: (message?: string) => void,
): { room: Room; connectError: string | undefined; leave: () => void } {
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
  const leavingRef = useRef(false);

  const handleUnexpectedDisconnect = useEffectEvent((reason?: DisconnectReason) => {
    if (leavingRef.current || reason === DisconnectReason.CLIENT_INITIATED) return;
    onLeave(
      disconnectMessage(reason) ?? "Você foi desconectado. Verifique sua internet e entre de novo.",
    );
  });

  useEffect(() => {
    let cancelled = false;
    // Até o connect() terminar, quem trata a falha é o catch abaixo: o SDK
    // também emite Disconnected quando a conexão nem chega a abrir, e isso
    // levaria à tela "Você saiu da sala" em vez de "Tentar de novo".
    let connected = false;

    const handleDisconnected = (reason?: DisconnectReason) => {
      if (!cancelled && connected) handleUnexpectedDisconnect(reason);
    };
    const handleReconnected = () => toast.success("Conexão restabelecida.");
    // Só falhas do microfone (o compartilhamento de tela tem os próprios avisos).
    const handleMediaError = (_error: Error, kind?: MediaDeviceKind) => {
      if (kind !== "audioinput") return;
      toast.error(
        "Não foi possível usar o microfone. Confira as permissões deste site e tente ligá-lo de novo.",
        { id: MIC_ERROR_TOAST },
      );
    };

    room
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.Reconnected, handleReconnected)
      .on(RoomEvent.MediaDevicesError, handleMediaError);

    const run = async () => {
      setConnectError(undefined);
      try {
        await connect(choices.serverUrl, choices.token);
        if (cancelled) return;
        connected = true;
        if (choices.micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true).catch(() => {
            toast.error(
              "Você entrou com o microfone desligado. Confira as permissões deste site e tente ligá-lo nos controles da sala.",
              { id: MIC_ERROR_TOAST },
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

  return { room, connectError, leave };
}
