import { createAudioAnalyser, createLocalAudioTrack, MediaDeviceFailure } from "livekit-client";
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import {
  createMicrophoneCheck,
  type MicrophoneCheck,
} from "@/features/room/domain/microphone-check";

interface MicLevelEvents {
  /** Available microphones (after permission, with names). */
  onDevices: (devices: MediaDeviceInfo[]) => void;
  /** The chosen microphone disappeared (disconnected): fall back to the default. */
  onMissingDevice: () => void;
  onPermissionDenied: () => void;
  onError: (error: unknown) => void;
  onCheck: (state: MicrophoneCheck, deviceId: string | undefined) => void;
}

/**
 * Live microphone meter: local capture + voice level, written straight to the
 * bar element (no re-render per frame). The level also goes to the
 * "listening" mascot through the returned ref.
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
  const onCheck = useEffectEvent(events.onCheck);

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
        // Cancelled during the await: cleanup already ran, so do not start the meter.
        if (cancelled) return;
        const inputs = list.filter((d) => d.kind === "audioinput" && d.deviceId);
        onDevices(inputs);
        if (deviceId && !inputs.some((d) => d.deviceId === deviceId)) onMissingDevice();

        const check = createMicrophoneCheck();
        let checkState: MicrophoneCheck = "waiting";
        onCheck(checkState, deviceId);

        const tick = () => {
          const volume = Math.min(1, analyser.calculateVolume() * 2.5);
          levelRef.current = volume;
          // Perceptual curve: normal speech fills a good part of the meter, not just the tip.
          meter.style.transform = `scaleX(${Math.sqrt(volume).toFixed(3)})`;
          const next = check(volume, performance.now());
          if (next !== checkState) {
            checkState = next;
            onCheck(next, deviceId);
          }
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
