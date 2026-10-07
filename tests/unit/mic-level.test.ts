import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useMicLevel } from "@/features/room/hooks/use-mic-level";

const capture = vi.hoisted(() => ({
  effect: undefined as (() => void | (() => void)) | undefined,
  createTrack: vi.fn(),
  createAnalyser: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => {
    capture.effect = effect;
  },
  useEffectEvent: (handler: unknown) => handler,
  useRef: (value: unknown) => ({ current: value }),
}));

vi.mock("livekit-client", () => ({
  createLocalAudioTrack: capture.createTrack,
  createAudioAnalyser: capture.createAnalyser,
  MediaDeviceFailure: { getFailure: () => undefined, PermissionDenied: "PermissionDenied" },
}));

const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
let now = 0;
const stop = vi.fn();
const dispose = vi.fn();
const volume = vi.fn(() => 0);
const devices = vi.fn(async () => [{ kind: "audioinput", deviceId: "mic-a" }]);

beforeEach(() => {
  vi.clearAllMocks();
  frames.clear();
  frameId = 0;
  now = 0;
  capture.createTrack.mockResolvedValue({ stop });
  capture.createAnalyser.mockReturnValue({ calculateVolume: volume, cleanup: dispose });
  volume.mockReturnValue(0);
  devices.mockResolvedValue([{ kind: "audioinput", deviceId: "mic-a" }]);
  vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices: devices } });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => vi.unstubAllGlobals());

/** Executado com os hooks simulados acima para controlar o ciclo de captura. */
function MicLevelHarness() {
  const meter = { style: { transform: "" } } as HTMLDivElement;
  const events = {
    onDevices: vi.fn(),
    onMissingDevice: vi.fn(),
    onPermissionDenied: vi.fn(),
    onError: vi.fn(),
    onCheck: vi.fn(),
  };
  const level = useMicLevel({ current: meter }, true, "mic-a", events);
  const cleanup = capture.effect?.();
  return { meter, events, level, cleanup };
}

function tick(time: number, value: number) {
  now = time;
  volume.mockReturnValue(value);
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(time);
}

test("publica mudanças do teste sem renderizar a cada quadro e limpa a captura", async () => {
  const { meter, events, level, cleanup } = MicLevelHarness();
  await vi.waitFor(() => expect(events.onCheck).toHaveBeenCalledWith("waiting", "mic-a"));
  for (let time = 50; time <= 300; time += 50) tick(time, 0.1);
  expect(events.onCheck.mock.calls).toEqual([
    ["waiting", "mic-a"],
    ["detected", "mic-a"],
  ]);
  expect(level.current).toBe(0.25);
  expect(meter.style.transform).toBe("scaleX(0.500)");
  tick(400, 0);
  tick(1800, 0);
  expect(events.onCheck).toHaveBeenLastCalledWith("confirmed", "mic-a");
  cleanup?.();
  expect(stop).toHaveBeenCalledOnce();
  expect(dispose).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  expect(level.current).toBe(0);
  expect(meter.style.transform).toBe("scaleX(0)");
});

test("uma captura cancelada antes de abrir não publica estado nem mantém o microfone", async () => {
  const pending = Promise.withResolvers<{ stop: typeof stop }>();
  capture.createTrack.mockReturnValue(pending.promise);
  const { events, cleanup } = MicLevelHarness();
  cleanup?.();
  pending.resolve({ stop });
  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
  expect(events.onCheck).not.toHaveBeenCalled();
  expect(capture.createAnalyser).not.toHaveBeenCalled();
  expect(frames.size).toBe(0);
});

test("cancelar durante a lista de aparelhos impede que a captura antiga atualize a tela", async () => {
  const pending = Promise.withResolvers<{ kind: string; deviceId: string }[]>();
  devices.mockReturnValue(pending.promise);
  const { events, cleanup } = MicLevelHarness();
  await vi.waitFor(() => expect(devices).toHaveBeenCalledOnce());
  cleanup?.();
  pending.resolve([{ kind: "audioinput", deviceId: "mic-a" }]);
  await pending.promise;
  expect(events.onDevices).not.toHaveBeenCalled();
  expect(events.onCheck).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledOnce();
  expect(dispose).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
});
