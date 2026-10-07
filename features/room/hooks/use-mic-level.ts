"use client";

import { createAudioAnalyser, createLocalAudioTrack, MediaDeviceFailure } from "livekit-client";
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";

interface MicLevelEvents {
  /** Microfones disponíveis (depois da permissão, com nome). */
  onDevices: (devices: MediaDeviceInfo[]) => void;
  /** O microfone escolhido sumiu (desconectado): volta para o padrão. */
  onMissingDevice: () => void;
  onPermissionDenied: () => void;
  onError: (error: unknown) => void;
}

/**
 * Medidor ao vivo do microfone: captura local + nível da voz, escrito direto no
 * elemento da barra (sem re-render por quadro). O nível também vai para o
 * mascote "ouvindo" pelo ref devolvido.
 */
export function useMicLevel(
  meterRef: RefObject<HTMLDivElement | null>,
  active: boolean,
  deviceId: string | undefined,
  events: MicLevelEvents,
): RefObject<number> {
  const levelRef = useRef(0);
  const onDevices = useEffectEvent(events.onDevices);
  const onMissingDevice = useEffectEvent(events.onMissingDevice);
  const onPermissionDenied = useEffectEvent(events.onPermissionDenied);
  const onError = useEffectEvent(events.onError);

  useEffect(() => {
    const meter = meterRef.current;
    if (!active || !meter) return;
    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      try {
        const track = await createLocalAudioTrack({
          deviceId,
          echoCancellation: true,
          noiseSuppression: true,
        });
        if (cancelled) {
          track.stop();
          return;
        }
        const analyser = createAudioAnalyser(track, { cloneTrack: false });
        cleanup = () => {
          void analyser.cleanup();
          track.stop();
        };

        const list = await navigator.mediaDevices.enumerateDevices();
        // Cancelado durante o await: a limpeza já rodou, então não inicia o medidor.
        if (cancelled) return;
        const inputs = list.filter((d) => d.kind === "audioinput" && d.deviceId);
        onDevices(inputs);
        if (deviceId && !inputs.some((d) => d.deviceId === deviceId)) onMissingDevice();

        const tick = () => {
          const volume = Math.min(1, analyser.calculateVolume() * 2.5);
          levelRef.current = volume;
          meter.style.transform = `scaleX(${volume.toFixed(3)})`;
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        if (cancelled) return;
        if (MediaDeviceFailure.getFailure(error) === MediaDeviceFailure.PermissionDenied) {
          onPermissionDenied();
        } else {
          onError(error);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup?.();
      meter.style.transform = "scaleX(0)";
      levelRef.current = 0;
    };
  }, [active, deviceId, meterRef]);

  return levelRef;
}
