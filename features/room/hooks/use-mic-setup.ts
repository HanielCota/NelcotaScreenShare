"use client";

import { useState, useSyncExternalStore, type RefObject } from "react";
import { micErrorMessage } from "@/features/room/client/connection-errors";
import { saveMicrophone, savedMicrophone } from "@/features/room/client/saved-microphone";
import { useMicLevel } from "./use-mic-level";
import { useMicPermission } from "./use-mic-permission";

/** O microfone salvo só muda por esta tela, que já guarda a escolha no estado. */
function subscribeNothing(): () => void {
  return () => {};
}

/**
 * Microfone na pré-entrada: ligado ou não, permissão do navegador, aparelho
 * escolhido (lembrado), erro e o medidor ao vivo. `paused`: entrando na sala.
 */
export function useMicSetup(paused: boolean, meterRef: RefObject<HTMLDivElement | null>) {
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string>();
  const [requesting, setRequesting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const { permission, setPermission, request } = useMicPermission();
  // Escolha feita nesta tela; antes disso vale o microfone da última vez.
  // `null` é "Padrão do sistema" escolhido de propósito.
  const [chosen, setChosen] = useState<string | null>();
  const saved = useSyncExternalStore(subscribeNothing, savedMicrophone, () => undefined);
  const deviceId = chosen === undefined ? saved : (chosen ?? undefined);
  // Medidor ao vivo sozinho: com a permissão dada e o microfone ligado, ninguém
  // precisa achar um botão "Testar" (leigo não testa e entra mudo).
  const testing = enabled && permission === "granted" && !error && !paused;
  const blocked = permission === "denied";

  const levelRef = useMicLevel(meterRef, testing, deviceId, {
    onDevices: setDevices,
    onMissingDevice: () => setChosen(null),
    onPermissionDenied: () => setPermission("denied"),
    onError: (failure) => setError(micErrorMessage(failure)),
  });

  return {
    levelRef,
    enabled,
    permission,
    error,
    requesting,
    devices,
    deviceId,
    testing,
    blocked,
    /** Entra sem microfone (desligado ou bloqueado pelo navegador). */
    joinsMuted: !enabled || blocked,
    setEnabled(next: boolean) {
      setEnabled(next);
      setError(undefined);
    },
    clearError: () => setError(undefined),
    choose(id: string | undefined) {
      setChosen(id ?? null);
      saveMicrophone(id);
    },
    async askPermission() {
      setRequesting(true);
      setError(undefined);
      const failure = await request();
      setRequesting(false);
      if (failure && !(failure instanceof DOMException && failure.name === "NotAllowedError")) {
        setError(micErrorMessage(failure));
      }
    },
  };
}

export type MicSetupState = ReturnType<typeof useMicSetup>;
