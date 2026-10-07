import { expect, test } from "vitest";
import { createMicrophoneCheck } from "@/features/room/domain/microphone-check";

test("silêncio, ruído baixo e picos isolados não confirmam o teste", () => {
  const check = createMicrophoneCheck();
  expect(check(0, 0)).toBe("waiting");
  expect(check(0.02, 50)).toBe("waiting");
  expect(check(0.8, 100)).toBe("waiting");
  expect(check(0, 150)).toBe("waiting");
  expect(check(Number.NaN, 200)).toBe("waiting");
  expect(check(0.8, 250)).toBe("waiting");
});

test("áudio sustentado confirma a captura e o resultado permanece depois do silêncio", () => {
  const check = createMicrophoneCheck();
  for (let time = 0; time < 200; time += 50) expect(check(0.1, time)).toBe("waiting");
  expect(check(0.1, 200)).toBe("detected");
  expect(check(0, 250)).toBe("detected");
  expect(check(0, 1700)).toBe("confirmed");
  expect(check(0, 5000)).toBe("confirmed");
  expect(check(0.2, 5050)).toBe("confirmed");
});

test("uma pausa nos quadros não conta como áudio contínuo", () => {
  const check = createMicrophoneCheck();
  expect(check(0.2, 0)).toBe("waiting");
  expect(check(0.2, 5000)).toBe("waiting");
  expect(check(0.2, 5100)).toBe("waiting");
  expect(check(0.2, 5200)).toBe("detected");
});

test("uma nova captura começa sem a confirmação do aparelho anterior", () => {
  const old = createMicrophoneCheck();
  old(0.2, 0);
  expect(old(0.2, 200)).toBe("detected");
  const next = createMicrophoneCheck();
  expect(next(0, 250)).toBe("waiting");
});
