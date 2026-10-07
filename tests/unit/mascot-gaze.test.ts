import { afterEach, expect, test, vi } from "vitest";
import { createMascotController } from "@/features/mascot/client/mascot-controller";
import type { Gaze } from "@/features/mascot/domain/eye-tracking";

vi.mock("@/features/mascot/client/page-input", () => ({ subscribePageInput: () => () => {} }));
vi.mock("@/features/mascot/client/ambient", () => ({ startAmbient: () => () => {} }));

afterEach(() => vi.unstubAllGlobals());

test("gaze follows the moving partner without relying on mouse events", () => {
  let time = 0;
  let nextFrame = 0;
  let partnerX = 500;
  let mirrored = false;
  const frames = new Map<number, FrameRequestCallback>();
  const partner = {
    isConnected: true,
    getBoundingClientRect: () => ({ left: partnerX, top: 0, width: 128, height: 128 }),
  };
  const root = {
    dataset: {},
    style: { setProperty: vi.fn() },
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => ({ querySelectorAll: () => [root, partner] }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getAnimations: () => [],
  };
  const face = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 128, height: 128 }),
    closest: () => (mirrored ? root : null),
  };
  vi.stubGlobal("performance", { now: () => time });
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false }),
    clearTimeout: vi.fn(),
    setTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("document", { hidden: false, activeElement: null });
  class Field {
    type = "text";
  }
  vi.stubGlobal("HTMLInputElement", Field);
  vi.stubGlobal("HTMLTextAreaElement", Field);
  vi.stubGlobal("HTMLButtonElement", Field);
  vi.stubGlobal("HTMLAnchorElement", Field);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  let gaze: Gaze | undefined;
  const controller = createMascotController(
    root as unknown as HTMLElement,
    face as unknown as HTMLElement,
    {
      lids: [],
      render: (next) => {
        gaze = { ...next };
      },
    },
    { base: () => "neutral", canSleep: () => false, activity: () => "walking", voice: () => 0 },
  );

  function advance() {
    for (let i = 0; i < 60; i++) {
      time += 16;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    }
  }

  try {
    advance();
    const far = gaze!.x;
    partnerX = 130;
    advance();
    expect(gaze!.x).toBeLessThan(far);
    expect(frames.size).toBe(1);
    mirrored = true;
    advance();
    expect(gaze!.x).toBeLessThan(0);
  } finally {
    controller.dispose();
  }
  expect(frames.size).toBe(0);
});
