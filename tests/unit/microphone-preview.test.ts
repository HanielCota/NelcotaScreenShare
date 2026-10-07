import { afterEach, expect, test, vi } from "vitest";
import {
  captureMicrophone,
  createMicrophoneAnalyser,
} from "@/features/room/client/microphone-preview";
import {
  micErrorMessage,
  microphonePermissionDenied,
} from "@/features/room/client/microphone-errors";

afterEach(() => vi.unstubAllGlobals());

test("a preview without an audio track releases every captured track", async () => {
  const stop = vi.fn();
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn(async () => ({
        getAudioTracks: () => [],
        getTracks: () => [{ stop }],
      })),
    },
  });
  await expect(captureMicrophone({ autoGainControl: true })).rejects.toThrow("no audio track");
  expect(stop).toHaveBeenCalledOnce();
});

test("the analyser measures voice and releases its nodes and AudioContext", async () => {
  const close = vi.fn(async () => {});
  const disconnectSource = vi.fn();
  const disconnectAnalyser = vi.fn();
  class PreviewContext {
    resume = vi.fn(async () => {});
    close = close;
    createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: disconnectSource });
    createAnalyser = () => ({
      frequencyBinCount: 2,
      getByteFrequencyData: (values: Uint8Array) => values.fill(255),
      disconnect: disconnectAnalyser,
    });
  }
  vi.stubGlobal("AudioContext", PreviewContext);
  vi.stubGlobal(
    "MediaStream",
    class {
      tracks = [];
    },
  );
  const stop = vi.fn();
  const analyser = createMicrophoneAnalyser({ stop } as unknown as MediaStreamTrack);
  expect(analyser.calculateVolume()).toBe(1);
  await analyser.cleanup();
  expect(close).toHaveBeenCalledOnce();
  expect(disconnectSource).toHaveBeenCalledOnce();
  expect(disconnectAnalyser).toHaveBeenCalledOnce();
  // The hook owns the capture, so closing the analyser cannot stop a replacement track.
  expect(stop).not.toHaveBeenCalled();
});

test("an AudioContext initialization error closes the partially created context", () => {
  const close = vi.fn(async () => {});
  class FailingContext {
    close = close;
    createMediaStreamSource() {
      throw new Error("source initialization failed");
    }
  }
  vi.stubGlobal("AudioContext", FailingContext);
  vi.stubGlobal(
    "MediaStream",
    class {
      tracks = [];
    },
  );
  expect(() => createMicrophoneAnalyser({} as MediaStreamTrack)).toThrow("initialization failed");
  expect(close).toHaveBeenCalledOnce();
});

test.each([
  ["NotAllowedError", "bloqueou"],
  ["PermissionDeniedError", "bloqueou"],
  ["NotFoundError", "Nenhum microfone"],
  ["DevicesNotFoundError", "Nenhum microfone"],
  ["NotReadableError", "em uso"],
  ["TrackStartError", "em uso"],
])("native microphone error %s keeps the appropriate instruction", (name, message) => {
  const error = new DOMException("capture failed", name);
  expect(micErrorMessage(error)).toContain(message);
  expect(microphonePermissionDenied(error)).toBe(message === "bloqueou");
});
