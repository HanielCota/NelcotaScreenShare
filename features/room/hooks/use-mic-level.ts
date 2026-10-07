import {
  captureMicrophone,
  createMicrophoneAnalyser,
} from "@/features/room/client/microphone-preview";
import { microphonePermissionDenied } from "@/features/room/client/microphone-errors";
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import {
  createMicrophoneCheck,
  type MicrophoneCheck,
} from "@/features/room/domain/microphone-check";

interface MicLevelEvents {
  /** Available microphones (after permission, with names). */
  onDevices: (devices: MediaDeviceInfo[]) => void;
  /** The device actually opened, which can differ from the requested preference. */
  onDevice: (capturedId: string | undefined, requestedId: string | undefined) => void;
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
  const onDevice = useEffectEvent(events.onDevice);
  const onMissingDevice = useEffectEvent(events.onMissingDevice);
  const onPermissionDenied = useEffectEvent(events.onPermissionDenied);
  const onError = useEffectEvent(events.onError);
  const onCheck = useEffectEvent(events.onCheck);

  useEffect(() => {
    const meter = meterRef.current;
    if (!active || !meter) return;
    const meterStyle = meter.style;
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) {
      onError(new Error("MediaDevices is unavailable."));
      return;
    }
    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    let captureRevision = 0;
    let devicesRevision = 0;
    let capturedId = deviceId;

    function stopCapture() {
      cancelAnimationFrame(frame);
      const release = cleanup;
      cleanup = undefined;
      release?.();
      meterStyle.transform = "scaleX(0)";
      levelRef.current = 0;
    }

    function fail(error: unknown, revision: number) {
      if (cancelled || revision !== captureRevision) return;
      captureRevision += 1;
      stopCapture();
      onCheck("starting", capturedId);
      if (microphonePermissionDenied(error)) {
        onPermissionDenied();
        return;
      }
      onError(error);
    }

    async function refreshDevices(revision: number) {
      const refreshRevision = ++devicesRevision;
      try {
        const list = await mediaDevices.enumerateDevices();
        if (cancelled || revision !== captureRevision || refreshRevision !== devicesRevision)
          return;
        const inputs = list.filter((device) => device.kind === "audioinput" && device.deviceId);
        onDevices(inputs);
        if (deviceId && !inputs.some((device) => device.deviceId === deviceId)) onMissingDevice();
      } catch (error) {
        if (refreshRevision !== devicesRevision) return;
        fail(error, revision);
      }
    }

    async function start() {
      const revision = ++captureRevision;
      stopCapture();
      try {
        const track = await captureMicrophone({
          deviceId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        if (cancelled || revision !== captureRevision) {
          track.stop();
          return;
        }
        let analyser: ReturnType<typeof createMicrophoneAnalyser> | undefined;
        const handleEnded = () => {
          if (cancelled || revision !== captureRevision) return;
          onCheck("starting", capturedId);
          void start();
        };
        // Register release before anything that can fail after opening the microphone.
        cleanup = () => {
          track.removeEventListener("ended", handleEnded);
          track.stop();
          void analyser?.cleanup().catch(() => {
            // The capture is already stopped, even if closing its AudioContext fails.
          });
        };
        track.addEventListener("ended", handleEnded);
        analyser = createMicrophoneAnalyser(track);
        const audioAnalyser = analyser;
        capturedId = track.getSettings().deviceId ?? deviceId;
        onDevice(capturedId, deviceId);
        await refreshDevices(revision);
        if (cancelled || revision !== captureRevision) return;

        const check = createMicrophoneCheck();
        let checkState: MicrophoneCheck = "waiting";
        onCheck(checkState, capturedId);

        const tick = () => {
          if (cancelled || revision !== captureRevision) return;
          try {
            const volume = Math.min(1, audioAnalyser.calculateVolume() * 2.5);
            levelRef.current = volume;
            // Perceptual curve: normal speech fills a good part of the meter, not just the tip.
            meterStyle.transform = `scaleX(${Math.sqrt(volume).toFixed(3)})`;
            const next = check(volume, performance.now());
            if (next !== checkState) {
              checkState = next;
              onCheck(next, capturedId);
            }
            frame = requestAnimationFrame(tick);
          } catch (error) {
            fail(error, revision);
          }
        };
        tick();
      } catch (error) {
        fail(error, revision);
      }
    }

    const handleDeviceChange = () => void refreshDevices(captureRevision);
    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    void start();

    return () => {
      cancelled = true;
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      stopCapture();
    };
  }, [active, deviceId, meterRef]);

  return levelRef;
}
