import { describe, expect, test, vi } from "vitest";
import { createPersonality, voiceAmount } from "@/components/mascot/personality";
import { createReasons } from "@/components/mascot/reasons";
import type { Expression } from "@/components/mascot/face";
import { createHandMotions } from "@/components/mascot/hand-motions";
import { EYE_SHAPES, pupilOffset } from "@/components/mascot/eye-tracking";

function fixture() {
  let time = 0;
  let nextId = 0;
  let available = true;
  let expression: Expression | undefined;
  let waves = 0;
  let holds = 0;
  let stops = 0;
  const dataset: DOMStringMap = {};
  const pending = new Map<number, { at: number; callback: () => void }>();
  const controller = createPersonality({
    root: { dataset } as unknown as HTMLElement,
    hands: {
      wave: () => {
        waves++;
      },
      hold: () => {
        holds++;
      },
      cancel: () => {},
    },
    react: (next) => {
      expression = next;
    },
    move: () => {},
    stopMotion: () => {
      stops++;
    },
    available: () => available,
    now: () => time,
    schedule: (callback, delay) => {
      const id = ++nextId;
      pending.set(id, { at: time + delay, callback });
      return id;
    },
    unschedule: (id) => {
      pending.delete(id);
    },
  });
  return {
    controller,
    dataset,
    pending,
    get expression() {
      return expression;
    },
    get waves() {
      return waves;
    },
    get holds() {
      return holds;
    },
    get stops() {
      return stops;
    },
    block() {
      available = false;
    },
    advance(ms: number) {
      const end = time + ms;
      while (true) {
        const next = [...pending]
          .filter(([, timer]) => timer.at <= end)
          .toSorted((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        pending.delete(next[0]);
        time = next[1].at;
        next[1].callback();
      }
      time = end;
    },
  };
}

describe("personalidade do Nelcota", () => {
  test("toca aqui espera a mão e comemora uma única vez antes de voltar ao repouso", () => {
    const f = fixture();
    f.controller.highFive();
    expect(f.controller.active).toBe("highFive");
    expect(f.holds).toBe(1);
    expect(f.dataset.highFive).toBe("true");
    f.controller.highFive();
    expect(f.expression).toBe("celebrate");
    expect(f.dataset.highFive).toBeUndefined();
    expect(f.waves).toBe(1);
    f.advance(1100);
    expect(f.expression).toBeUndefined();
    expect(f.pending.size).toBe(0);
  });

  test("convite expira sem comemorar e respeita o intervalo entre ofertas automáticas", () => {
    const f = fixture();
    expect(f.controller.offerHighFive()).toBe(true);
    f.advance(7000);
    expect(f.dataset.highFive).toBeUndefined();
    expect(f.waves).toBe(0);
    expect(f.controller.offerHighFive()).toBe(false);
    f.advance(13_000);
    expect(f.controller.offerHighFive()).toBe(true);
  });

  test("carinho interrompe o espirro e suas etapas atrasadas não reaparecem", () => {
    const f = fixture();
    f.controller.sneeze();
    f.advance(650);
    expect(f.expression).toBe("sneezing");
    f.controller.pet();
    f.advance(500);
    expect(f.expression).toBe("pet");
    f.advance(900);
    expect(f.expression).toBeUndefined();
    expect(f.pending.size).toBe(0);
  });

  test("limpeza cancela timers, pose sustentada e movimento do corpo", () => {
    const f = fixture();
    f.controller.yawn();
    f.controller.cancel();
    const stopped = f.stops;
    f.advance(5000);
    expect(f.expression).toBeUndefined();
    expect(f.controller.active).toBeUndefined();
    expect(f.pending.size).toBe(0);
    expect(f.stops).toBe(stopped);
  });

  test("senha, erro, aba escondida ou contexto ocupado podem impedir brincadeiras", () => {
    const f = fixture();
    f.block();
    f.controller.pet();
    f.controller.sneeze();
    f.controller.highFive();
    f.controller.stretch();
    expect(f.expression).toBeUndefined();
    expect(f.holds).toBe(0);
    expect(f.pending.size).toBe(0);
  });

  test("bocejo passa pela espreguiçada e devolve a expressão de sono", () => {
    const f = fixture();
    f.controller.yawn();
    expect(f.expression).toBe("yawning");
    f.advance(1200);
    expect(f.expression).toBe("stretching");
    f.advance(1000);
    expect(f.expression).toBeUndefined();
    const reasons = createReasons(() => 0);
    reasons.set("sleep", "sleepy");
    reasons.set("interaction", "yawning");
    expect(reasons.current("neutral")).toBe("yawning");
    reasons.delete("interaction");
    expect(reasons.current("neutral")).toBe("sleepy");
  });

  test("erros e sono profundo mantêm prioridade sobre carinho e curiosidade", () => {
    const reasons = createReasons(() => 0);
    reasons.set("interaction", "pet");
    reasons.set("curiosity", "curious");
    reasons.set("error", "grumpy");
    expect(reasons.current("neutral")).toBe("grumpy");
    reasons.set("sleep", "asleep");
    expect(reasons.current("neutral")).toBe("asleep");
  });

  test("voz ignora ruído e valores inválidos e mantém o movimento limitado", () => {
    for (const input of [NaN, Infinity, -1, 0, 0.06]) expect(voiceAmount(input)).toBe(0);
    expect(voiceAmount(0.41)).toBeCloseTo(0.5);
    expect(voiceAmount(100)).toBe(1);
  });

  test("movimento reduzido não inicia animação de mão sustentada", () => {
    const animate = vi.fn();
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    try {
      const root = { querySelector: () => ({ animate }) } as unknown as HTMLElement;
      const hands = createHandMotions(root);
      hands.hold();
      hands.wave();
      expect(animate).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("novas inclinações mantêm as bordas das pupilas dentro dos olhos", () => {
    for (const eye of EYE_SHAPES) {
      for (const tilt of [-15, -9, 9, 15]) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
          const offset = pupilOffset({ x: Math.cos(angle), y: Math.sin(angle) }, eye, 1.05, tilt);
          for (let edge = 0; edge < Math.PI * 2; edge += Math.PI / 12) {
            const x = offset.x + Math.cos(edge) * eye.pupilRx * 1.05;
            const y = offset.y + Math.sin(edge) * eye.pupilRy * 1.05;
            expect((x / eye.rx) ** 2 + (y / eye.ry) ** 2).toBeLessThan(1);
          }
        }
      }
    }
  });
});
