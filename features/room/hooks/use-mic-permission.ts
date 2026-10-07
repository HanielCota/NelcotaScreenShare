import { useCallback, useEffect, useState } from "react";

/**
 * "unknown": o navegador não informa (sem Permissions API): tratado como
 * "ainda não pedido".
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
      .catch(() => {
        // Navegador sem a permissão "microphone" na API: fica "unknown".
      });
    return () => {
      cancelled = true;
      status?.removeEventListener("change", update);
    };
  }, []);

  /** Abre o pedido do navegador. Devolve o erro, se houver, para a mensagem. */
  const request = useCallback(async (): Promise<unknown> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      setPermission("granted");
      return undefined;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPermission("denied");
      }
      return error;
    }
  }, []);

  return { permission, setPermission, request };
}
