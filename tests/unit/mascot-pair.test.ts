import { describe, expect, test } from "vitest";
import { createPairMotion } from "@/features/mascot/engine/pair-motion";
import { nextPairRest, PAIR_STEP_MS } from "@/features/mascot/engine/pair";

function approaching() {
  const motion = createPairMotion(() => 0);
  motion.resize({ width: 672, size: 128 });
  motion.advance(6000, true);
  return motion;
}

describe("movimento sincronizado do par", () => {
  test("o descanso varia entre seis e dez segundos e respeita campos ocupados", () => {
    expect(nextPairRest(0)).toBe(6000);
    expect(nextPairRest(1)).toBe(10000);
    const motion = createPairMotion(() => 0.5);
    motion.resize({ width: 672, size: 128 });
    motion.advance(7999, true);
    expect(motion.state.phase).toBe("rest");
    motion.advance(1, false);
    expect(motion.state.phase).toBe("rest");
    motion.advance(100, true);
    expect(motion.state.phase).toBe("approach");
  });

  test("só prepara o cumprimento quando ambos chegam", () => {
    const motion = approaching();
    motion.advance(1000, true);
    expect(motion.state.phase).toBe("approach");
    motion.advance(PAIR_STEP_MS.walk, true);
    expect(motion.state.phase).toBe("ready");
    expect(motion.state.visitor).toBeCloseTo(672 / 2 - 128 * 0.43);
    expect(motion.state.resident).toBeCloseTo(672 / 2 + 128 * 0.43);
  });

  test("redimensionar perto da chegada preserva posição e aguarda o novo destino", () => {
    const motion = approaching();
    motion.advance(2900, true);
    const before = motion.state;
    motion.resize({ width: 1000, size: 128 });
    expect(motion.state.visitor).toBe(before.visitor);
    expect(motion.state.resident).toBe(before.resident);
    motion.advance(300, true);
    expect(motion.state.phase).toBe("approach");
    motion.advance(5000, true);
    expect(motion.state.phase).toBe("ready");
    expect(motion.state.visitor).toBeCloseTo(1000 / 2 - 128 * 0.43);
    expect(motion.state.resident).toBeCloseTo(1000 / 2 + 128 * 0.43);
  });

  test("novo tamanho durante a preparação exige chegar de novo antes do toque", () => {
    const motion = approaching();
    motion.advance(4000, true);
    motion.advance(400, true);
    motion.resize({ width: 1000, size: 128 });
    expect(motion.state.phase).toBe("approach");
    motion.advance(50, true);
    expect(motion.state.phase).toBe("approach");
  });

  test("pausar a caminhada mantém posição e não consome o movimento restante", () => {
    const motion = approaching();
    motion.advance(1000, true);
    motion.suspend(true);
    const frozen = motion.state;
    motion.advance(60_000, true);
    expect(motion.state).toEqual(frozen);
    motion.suspend(false);
    motion.advance(100, true);
    expect(motion.state.phase).toBe("approach");
    expect(motion.state.visitor).toBeGreaterThan(frozen.visitor);
    expect(motion.state.visitor - frozen.visitor).toBeLessThan(10);
  });

  test("pausar a preparação também preserva o prazo do cumprimento", () => {
    const motion = approaching();
    motion.advance(4000, true);
    motion.advance(200, true);
    motion.suspend(true);
    motion.advance(60_000, true);
    motion.suspend(false);
    motion.advance(249, true);
    expect(motion.state.phase).toBe("ready");
    motion.advance(1, true);
    expect(motion.state.phase).toBe("hit");
  });

  test("interromper parte da posição atual e não ultrapassa o repouso", () => {
    const motion = approaching();
    motion.advance(800, true);
    const before = motion.state;
    motion.retreat();
    expect(motion.state.visitor).toBe(before.visitor);
    expect(motion.state.resident).toBe(before.resident);
    motion.advance(100, true);
    expect(motion.state.visitor).toBeLessThan(before.visitor);
    motion.advance(10_000, true);
    expect(motion.state.phase).toBe("rest");
    expect(motion.state.visitor).toBeCloseTo(672 * 0.16);
    motion.advance(5999, true);
    expect(motion.state.phase).toBe("rest");
  });

  test("toque, comemoração e retorno completam um encontro sem saltos ou ciclos extras", () => {
    const motion = approaching();
    motion.advance(4000, true);
    motion.advance(PAIR_STEP_MS.ready, true);
    expect(motion.state.phase).toBe("hit");
    motion.advance(180, true);
    expect(motion.state.phase).toBe("hit");
    expect(motion.state.visitor).toBeCloseTo(672 / 2 - 128 * 0.39);
    motion.advance(PAIR_STEP_MS.hit - 180, true);
    expect(motion.state.phase).toBe("cheer");
    motion.advance(PAIR_STEP_MS.cheer, true);
    expect(motion.state.phase).toBe("return");
    motion.advance(PAIR_STEP_MS.walk, true);
    expect(motion.state.phase).toBe("rest");
    motion.advance(6000, true);
    expect(motion.state.phase).toBe("approach");
  });
});
