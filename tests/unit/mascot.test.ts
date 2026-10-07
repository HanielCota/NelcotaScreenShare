import assert from "node:assert/strict";
import { test } from "vitest";

const { createReasons } = await import("../../features/mascot/engine/reasons");
const { EXPRESSIONS, toFaceState } = await import("../../features/mascot/engine/face");
const { springStep } = await import("../../features/mascot/engine/spring");
const { createHandMotions } = await import("../../features/mascot/dom/hand-motions");
const { avatarFrame } = await import("../../features/mascot/engine/avatar-frames");
const { idleSleep } = await import("../../features/mascot/engine/sleep");
const { gazeAt, pupilOffset, eyelidOffset, EYE_SHAPES, POSE_EYES, IDLE } =
  await import("../../features/mascot/engine/eye-tracking");

test("a curva e o traço da pálpebra ficam completamente fora do olho aberto", () => {
  for (const { ry } of EYE_SHAPES) {
    const lowestStrokeEdge = eyelidOffset(ry, 0) + ry + 5 + 2.5 / 2;
    assert.ok(lowestStrokeEdge < -ry, "nenhum pedaço do traço pode entrar no recorte");
    assert.equal(eyelidOffset(ry, 1), 0);
    assert.ok(eyelidOffset(ry, 0.6) > eyelidOffset(ry, 0));
  }
});

test("os dois olhos convergem para o cursor perto do rosto e continuam respondendo à distância", () => {
  const bounds = { left: 100, top: 50, width: 512, height: 512 };
  const left = POSE_EYES[0][0];
  const right = POSE_EYES[0][1];
  const midpoint = {
    x: bounds.left + (left.x + right.x) / 2,
    y: bounds.top + (left.y + right.y) / 2,
  };
  const near = gazeAt(bounds, midpoint);
  assert.ok(
    near.leftX > 0 && near.rightX < 0,
    "cada olho mira o mesmo cursor, em vez de copiar o outro",
  );
  const overLeftEye = gazeAt(bounds, { x: bounds.left + left.x, y: bounds.top + left.y });
  assert.equal(overLeftEye.leftX, 0);
  assert.equal(overLeftEye.leftY, 0);
  const far = gazeAt(bounds, { x: midpoint.x + 400, y: midpoint.y });
  const farther = gazeAt(bounds, { x: midpoint.x + 800, y: midpoint.y });
  assert.ok(farther.leftX > far.leftX, "o olhar não congela depois de 140 pixels");
  assert.ok(Math.hypot(farther.leftX, farther.leftY) < 1);
});

test("as pupilas ficam dentro dos olhos em qualquer direção, inclinação e expressão", () => {
  for (const eye of EYE_SHAPES) {
    for (const scale of [0.68, 1, 1.05]) {
      for (const tilt of [-7, 0, 5]) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
          const offset = pupilOffset({ x: Math.cos(angle), y: Math.sin(angle) }, eye, scale, tilt);
          for (let edge = 0; edge < Math.PI * 2; edge += Math.PI / 12) {
            const x = offset.x + Math.cos(edge) * eye.pupilRx * scale;
            const y = offset.y + Math.sin(edge) * eye.pupilRy * scale;
            assert.ok(
              (x / eye.rx) ** 2 + (y / eye.ry) ** 2 < 1,
              "a borda da pupila não deve ser cortada",
            );
          }
        }
      }
    }
  }
});

test("o olhar rápido mantém continuidade nas inversões mesmo a 30 quadros por segundo", () => {
  const gaze = { ...IDLE };
  const velocity = { ...IDLE };
  const bounds = { left: 0, top: 0, width: 208, height: 208 };
  for (let frame = 0; frame < 120; frame++) {
    const target = gazeAt(bounds, { x: frame % 8 < 4 ? -500 : 800, y: frame % 6 < 3 ? -500 : 800 });
    springStep(gaze, velocity, target, 0.14, 1 / 30);
    for (const value of Object.values(gaze))
      assert.ok(Number.isFinite(value) && Math.abs(value) <= 1);
  }
});

test("o avatar fecha os olhos durante a senha, mesmo se estava comemorando", () => {
  assert.deepEqual(avatarFrame("celebrate", 1, 1), { column: 0, row: 1 });
  assert.deepEqual(avatarFrame("celebrate", 0, 0), { column: 1, row: 0 });
  assert.deepEqual(avatarFrame("worried", 0, 0), { column: 1, row: 1 });
  assert.deepEqual(avatarFrame(undefined), { column: 0, row: 0 });
});

test("um erro pode substituir a comemoração, e digitar limpa a reação anterior", () => {
  let time = 0;
  const reasons = createReasons(() => time);
  reasons.set("celebrate", "celebrate", 1600);
  reasons.delete("celebrate");
  reasons.set("error", "grumpy", 4000);
  assert.equal(reasons.current("neutral"), "grumpy");
  reasons.delete("error");
  reasons.set("typing", "happy", 2000);
  assert.equal(reasons.current("neutral"), "happy");
  time = 2000;
  assert.equal(reasons.current("neutral"), "neutral");
  assert.equal(reasons.nextExpiry(), Infinity);
});

test("acordar remove o sono mesmo antes de terminar sua expressão", () => {
  const reasons = createReasons(() => 0);
  reasons.set("sleep", "asleep");
  assert.equal(reasons.current("neutral"), "asleep");
  reasons.delete("sleep");
  assert.equal(reasons.current("neutral"), "neutral");
  const value = toFaceState(EXPRESSIONS.asleep);
  const target = toFaceState(EXPRESSIONS.neutral);
  const velocity = {
    tilt: 0,
    pupil: 0,
    lid0: 0,
    lid1: 0,
    rest: 0,
  };
  for (let frame = 0; frame < 12; frame++) springStep(value, velocity, target, 0.32, 1 / 30);
  assert.ok(value.lid0 < 0.02, "os olhos reabrem em menos de meio segundo");
  assert.ok(value.lid1 < 0.02);
  assert.ok(value.rest < 0.02, "o corpo também se levanta ao acordar");
});

test("o sono considera a atividade mais recente, mesmo com timers atrasados", () => {
  assert.deepEqual(idleSleep(0, 29_999), { expression: null, nextIn: 1 });
  assert.deepEqual(idleSleep(0, 30_000), { expression: "sleepy", nextIn: 15_000 });
  assert.deepEqual(idleSleep(0, 45_000), { expression: "asleep", nextIn: Infinity });
  assert.equal(idleSleep(0, 90_000).expression, "asleep");
  assert.deepEqual(idleSleep(29_500, 30_000), { expression: null, nextIn: 29_500 });
  assert.deepEqual(idleSleep(44_900, 45_000), { expression: null, nextIn: 29_900 });
});

test("o cochilo substitui um aviso persistente e acordar restaura esse aviso", () => {
  const reasons = createReasons(() => 0);
  reasons.set("capsLock", "surprised");
  reasons.set("sleep", "sleepy");
  assert.equal(reasons.current("neutral"), "sleepy");
  reasons.set("sleep", "asleep");
  assert.equal(reasons.current("neutral"), "asleep");
  reasons.delete("sleep");
  assert.equal(reasons.current("neutral"), "surprised");
});

test("sonolência mantém os olhos parcialmente abertos e antecede a postura de sono", () => {
  assert.deepEqual(avatarFrame("sleepy", 0.6, 0.6), avatarFrame("neutral"));
  assert.notDeepEqual(avatarFrame("asleep", 1, 1), avatarFrame("sleepy", 0.6, 0.6));
  const value = toFaceState(EXPRESSIONS.neutral);
  const velocity = Object.fromEntries(Object.keys(value).map((key) => [key, 0]));
  for (const target of [EXPRESSIONS.sleepy, EXPRESSIONS.asleep, EXPRESSIONS.neutral]) {
    for (let frame = 0; frame < 90; frame++)
      springStep(value, velocity, toFaceState(target), 0.85, 1 / 30);
    assert.ok(Math.abs(value.rest - target.rest) < 0.002);
    assert.ok(Math.abs(value.lid0 - target.lid) < 0.002);
  }
});

test("molas ficam limitadas a 30fps e não explodem quando o alvo muda rapidamente", () => {
  const value = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  for (let frame = 0; frame < 120; frame++) {
    const target = { x: frame % 8 < 4 ? -1 : 1, y: frame % 8 < 4 ? 1 : -1 };
    springStep(value, velocity, target, 0.2, 1 / 30);
    assert.ok(Number.isFinite(value.x) && Number.isFinite(value.y));
    assert.ok(Math.abs(value.x) <= 1 && Math.abs(value.y) <= 1);
  }
});

test("senha fecha ambos os olhos e mostrar a senha permite espiar", () => {
  assert.deepEqual(toFaceState(EXPRESSIONS.happy, [1, 1]), {
    ...toFaceState(EXPRESSIONS.happy),
    lid0: 1,
    lid1: 1,
  });
  const peeking = toFaceState(EXPRESSIONS.happy, [1, 0]);
  assert.equal(peeking.lid0, 1);
  assert.equal(peeking.lid1, 0);
});

test("acenos repetidos substituem os anteriores e a limpeza interrompe a animação", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let reduced = false;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches: reduced }) },
  });
  const elements = Array.from({ length: 1 }, () => {
    const active = new Set<Animation>();
    const calls: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
    return {
      active,
      calls,
      getAnimations: () => [...active],
      animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        const listeners = new Map<string, () => void>();
        const animation = {
          addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
          cancel() {
            active.delete(animation);
            listeners.get("cancel")?.();
          },
        } as unknown as Animation;
        calls.push({ keyframes, options });
        active.add(animation);
        return animation;
      },
    };
  });
  try {
    const avatarHands = createHandMotions({
      querySelector: (selector: string) =>
        selector === "[data-mascot-sprite]" ? elements[0] : null,
    } as unknown as HTMLElement);
    reduced = false;
    for (let tap = 0; tap < 20; tap++) avatarHands.wave();
    assert.equal(elements[0]?.active.size, 1);
    assert.equal(elements[0]?.calls.at(-1)?.options.easing, "linear");
    assert.ok(
      elements[0]?.calls.at(-1)?.keyframes.every((frame) => frame.easing === "steps(1, end)"),
    );
    avatarHands.cancel();
    assert.equal(elements[0]?.active.size, 0);
    reduced = true;
    avatarHands.wave();
    assert.equal(elements[0]?.active.size, 0);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
