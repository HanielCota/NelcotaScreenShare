import { useCallback, useEffect, useState } from "react";
import { microphonePermissionDenied } from "@/features/room/client/microphone-errors";
import { logBrowserWarning } from "@/lib/telemetry.client";

/**
 * "unknown": the browser does not tell (no Permissions API): treated as
 * "not requested yet".
 */
export type MicPermission = "unknown" | "prompt" | "granted" | "denied";

export function useMicPermission() {
  const [permission, setPermission] = useState<MicPermission>("unknown");

  useEffect(() => {
    let status: PermissionStatus | undefined;
    let cancelled = false;
    const update = () => {
      if (status) setPermission(status.state);
    };
    navigator.permissions
      ?.query({ name: "microphone" })
      .then((result) => {
        if (cancelled) return;
        status = result;
        update();
        result.addEventListener("change", update);
      })
      .catch((error: unknown) => {
        // Browser without the "microphone" permission in the API: stays "unknown".
        logBrowserWarning("Could not read the microphone permission", error);
      });
    return () => {
      cancelled = true;
      status?.removeEventListener("change", update);
    };
  }, []);

  /** Opens the browser prompt. Returns the error, if any, for the message. */
  const request = useCallback(async (): Promise<unknown> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      setPermission("granted");
      return undefined;
    } catch (error) {
      if (microphonePermissionDenied(error)) setPermission("denied");
      return error;
    }
  }, []);

  return { permission, setPermission, request };
}
