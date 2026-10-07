import { useState, useSyncExternalStore, type RefObject } from "react";
import { micErrorMessage } from "@/features/room/client/connection-errors";
import { saveMicrophone, savedMicrophone } from "@/features/room/client/saved-microphone";
import { useMicLevel } from "./use-mic-level";
import { useMicPermission } from "./use-mic-permission";
import type { MicrophoneCheck } from "@/features/room/domain/microphone-check";

/** The saved microphone only changes through this screen, which already keeps the choice in state. */
function subscribeNothing(): () => void {
  return () => {};
}

/**
 * Microphone in the pre-join screen: on or off, browser permission, chosen
 * device (remembered), error and the live meter. `paused`: joining the room.
 */
export function useMicSetup(paused: boolean, meterRef: RefObject<HTMLDivElement | null>) {
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string>();
  const [requesting, setRequesting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [check, setCheck] = useState<{ deviceId: string | undefined; state: MicrophoneCheck }>();
  const { permission, setPermission, request } = useMicPermission();
  // Choice made on this screen; before that, the microphone from last time applies.
  // `null` is "Padrão do sistema" chosen on purpose.
  const [chosen, setChosen] = useState<string | null>();
  const saved = useSyncExternalStore(subscribeNothing, savedMicrophone, () => undefined);
  const deviceId = chosen === undefined ? saved : (chosen ?? undefined);
  // Live meter on its own: with permission granted and the microphone on, nobody
  // has to find a "Testar" button (non-technical users do not test and join muted).
  const testing = enabled && permission === "granted" && !error && !paused;
  const blocked = permission === "denied";

  const levelRef = useMicLevel(meterRef, testing, deviceId, {
    onDevices: setDevices,
    onMissingDevice: () => setChosen(null),
    onPermissionDenied: () => setPermission("denied"),
    onError: (failure) => setError(micErrorMessage(failure)),
    onCheck: (state, source) => setCheck({ deviceId: source, state }),
  });

  return {
    levelRef,
    check:
      testing && check !== undefined && check.deviceId === deviceId
        ? check.state
        : ("starting" as MicrophoneCheck),
    enabled,
    permission,
    error,
    requesting,
    devices,
    deviceId,
    testing,
    blocked,
    /** Joins without a microphone (turned off or blocked by the browser). */
    joinsMuted: !enabled || blocked,
    setEnabled(next: boolean) {
      setEnabled(next);
      setError(undefined);
      setCheck(undefined);
    },
    clearError: () => {
      setError(undefined);
      setCheck(undefined);
    },
    choose(id: string | undefined) {
      setChosen(id ?? null);
      setCheck(undefined);
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
