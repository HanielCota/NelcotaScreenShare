import { beforeEach, expect, test, vi } from "vitest";
import type { useMicLevel } from "@/features/room/hooks/use-mic-level";
import { useMicSetup } from "@/features/room/hooks/use-mic-setup";

const capture = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  level: vi.fn<typeof useMicLevel>(() => ({ current: 0 })),
  saved: vi.fn<() => string | undefined>(() => "mic-a"),
  save: vi.fn(),
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = capture.cursor++;
    if (index >= capture.states.length) capture.states.push(initial);
    return [capture.states[index], (value: unknown) => (capture.states[index] = value)];
  },
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));

vi.mock("@/features/room/hooks/use-mic-level", () => ({ useMicLevel: capture.level }));
vi.mock("@/features/room/hooks/use-mic-permission", () => ({
  useMicPermission: () => ({ permission: "granted", setPermission: vi.fn(), request: vi.fn() }),
}));
vi.mock("@/features/room/client/saved-microphone", () => ({
  savedMicrophone: capture.saved,
  saveMicrophone: capture.save,
}));

beforeEach(() => {
  vi.clearAllMocks();
  capture.states = [];
  capture.saved.mockReturnValue("mic-a");
});

/** Re-renders the hook while keeping its state and controlling capture events. */
function MicSetupHarness(paused = false) {
  capture.cursor = 0;
  const mic = useMicSetup(paused, { current: null });
  const call = capture.level.mock.calls.at(-1);
  if (!call) throw new Error("The microphone capture was not initialized.");
  return { mic, events: call[3], requestedId: call[2] };
}

test("the captured fallback is shown and carried into joining without changing the preference", () => {
  const { events } = MicSetupHarness();
  events.onDevice("mic-b", "mic-a");
  events.onCheck("confirmed", "mic-b");
  const preview = MicSetupHarness();
  expect(preview.mic.deviceId).toBe("mic-b");
  expect(preview.mic.check).toBe("confirmed");
  expect(preview.requestedId).toBe("mic-a");
  const joining = MicSetupHarness(true);
  expect(joining.mic.deviceId).toBe("mic-b");
  expect(joining.mic.testing).toBe(false);
});

test("a new choice cannot reuse the previous device or its confirmation", () => {
  const { events } = MicSetupHarness();
  events.onDevice("mic-b", "mic-a");
  events.onCheck("confirmed", "mic-b");
  MicSetupHarness().mic.choose("headset");
  const next = MicSetupHarness();
  expect(next.requestedId).toBe("headset");
  expect(next.mic.deviceId).toBe("headset");
  expect(next.mic.check).toBe("starting");
  expect(capture.save).toHaveBeenLastCalledWith("headset");
});

test("a missing preference is forgotten and the replacement is tested separately", () => {
  const { events } = MicSetupHarness();
  events.onDevice("mic-a", "mic-a");
  events.onCheck("confirmed", "mic-a");
  events.onMissingDevice();
  const fallback = MicSetupHarness();
  expect(fallback.requestedId).toBeUndefined();
  expect(fallback.mic.check).toBe("starting");
  expect(capture.save).toHaveBeenLastCalledWith(undefined);
  fallback.events.onDevice("mic-b", undefined);
  fallback.events.onCheck("waiting", "mic-b");
  const next = MicSetupHarness();
  expect(next.mic.deviceId).toBe("mic-b");
  expect(next.mic.check).toBe("waiting");
});
