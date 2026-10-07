import { afterEach, expect, test, vi } from "vitest";
import { createPairController } from "@/features/mascot/dom/pair-controller";
import type { PairPhase } from "@/features/mascot/engine/pair";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fixture() {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  let resize: (() => void) | undefined;
  const properties = new Map<string, string>();
  const scene = Object.assign(new EventTarget(), {
    clientWidth: 672,
    dataset: {},
    style: { setProperty: (key: string, value: string) => properties.set(key, value) },
    querySelector: (selector: string) =>
      selector === '[data-slot="mascot"]' ? { offsetWidth: 128 } : null,
  });
  const preference = Object.assign(new EventTarget(), { matches: false });
  const doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  vi.stubGlobal("document", doc);
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      matchMedia: () => preference,
      setTimeout,
      clearTimeout,
    }),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  let phase: PairPhase = "rest";
  const controller = createPairController(scene as unknown as HTMLElement, false, (next) => {
    phase = next;
  });
  return {
    scene,
    doc,
    preference,
    controller,
    properties,
    resize: () => resize?.(),
    get phase() {
      return phase;
    },
  };
}

test("pending congela a posição e o controlador retoma sem reiniciar o encontro", () => {
  const f = fixture();
  vi.advanceTimersByTime(7000);
  expect(f.phase).toBe("approach");
  f.controller.setPending(true);
  const frozen = f.properties.get("--visitor-x");
  vi.advanceTimersByTime(60_000);
  expect(f.phase).toBe("approach");
  expect(f.properties.get("--visitor-x")).toBe(frozen);
  f.controller.setPending(false);
  expect(f.properties.get("--visitor-x")).toBe(frozen);
  vi.advanceTimersByTime(32);
  expect(parseFloat(f.properties.get("--visitor-x")!)).toBeGreaterThan(parseFloat(frozen!));
  f.controller.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

test("redimensionamento retargeteia o movimento sem cumprir o prazo antigo", () => {
  const f = fixture();
  vi.advanceTimersByTime(8800);
  f.scene.clientWidth = 1000;
  f.resize();
  vi.advanceTimersByTime(600);
  expect(f.phase).toBe("approach");
  vi.advanceTimersByTime(2200);
  expect(["ready", "hit", "cheer"]).toContain(f.phase);
  f.controller.dispose();
});

test("aba escondida e movimento reduzido congelam também o prazo de preparação", () => {
  const f = fixture();
  vi.advanceTimersByTime(9400);
  expect(f.phase).toBe("ready");
  f.doc.hidden = true;
  f.doc.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(60_000);
  expect(f.phase).toBe("ready");
  f.preference.matches = true;
  f.doc.hidden = false;
  f.doc.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(60_000);
  expect(f.phase).toBe("ready");
  f.preference.matches = false;
  f.preference.dispatchEvent(new Event("change"));
  vi.advanceTimersByTime(300);
  expect(f.phase).toBe("hit");
  f.controller.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
