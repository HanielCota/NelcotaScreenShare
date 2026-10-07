import { describe, expect, it } from "vitest";
import { pairActivity } from "@/features/mascot/engine/pair";
import {
  blinkLid,
  blocksPlay,
  canBlink,
  canGreet,
  canSneeze,
  faceResponse,
  gazeFocus,
  isSleeping,
  listeningFace,
  PAIR_BUSY_SELECTOR,
  reactionTo,
  waitingGaze,
} from "@/features/mascot/engine/rules";

describe("regras por expressão", () => {
  it("sono: olhar parado e pálpebras lentas, mas a pupila segue normal", () => {
    expect(isSleeping("sleepy")).toBe(true);
    expect(isSleeping("asleep")).toBe(true);
    expect(isSleeping("happy")).toBe(false);
    expect(gazeFocus("asleep")).toBe("idle");
    expect(faceResponse("asleep", "lid0")).toBe(0.85);
    expect(faceResponse("asleep", "pupil")).toBe(0.32);
    expect(faceResponse("happy", "lid0")).toBe(0.32);
  });

  it("o que bloqueia brincadeira, piscada, aceno e espirro", () => {
    for (const expression of ["grumpy", "worried", "skeptical", "asleep"] as const) {
      expect(blocksPlay(expression)).toBe(true);
    }
    expect(blocksPlay("sleepy")).toBe(false);
    expect(canBlink("worried")).toBe(false);
    expect(canBlink("skeptical")).toBe(true);
    expect(canGreet("grumpy")).toBe(false);
    expect(canGreet("sleepy")).toBe(true);
    expect(canSneeze("curious")).toBe(true);
    expect(canSneeze("waiting")).toBe(false);
  });

  it("para onde olhar além do ponteiro", () => {
    expect(gazeFocus("walking")).toBe("partner");
    expect(gazeFocus("greeting")).toBe("partner");
    expect(gazeFocus("presenting")).toBe("stage");
    expect(gazeFocus("neutral")).toBe("free");
  });

  it('o par não anda com alguém ocupado (exceto o próprio "toca aqui")', () => {
    expect(PAIR_BUSY_SELECTOR).toContain('[data-gesture]:not([data-gesture="highFive"])');
    expect(PAIR_BUSY_SELECTOR).toContain('[data-expression="yawning"]');
    expect(PAIR_BUSY_SELECTOR).not.toContain('"happy"');
  });

  it("esperando, ouvindo e piscando", () => {
    expect(waitingGaze(0).x).toBe(0);
    expect(Math.abs(waitingGaze(1100 * (Math.PI / 2)).x - 0.55)).toBeLessThan(1e-9);
    const face = { tilt: 0, pupil: 1, lid0: 0, lid1: 0, rest: 0 };
    expect(listeningFace(face, 1)).toEqual({ ...face, tilt: 3, pupil: 1.05 });
    expect(blinkLid(0.5)).toBe(1);
    expect(blinkLid(1)).toBe(0);
  });
});

describe("reação aos avisos das telas", () => {
  it("comemora: esquece o erro, pula e acena forte", () => {
    expect(reactionTo({ type: "celebrate" })).toMatchObject({
      clear: ["error"],
      set: { reason: "celebrate", expression: "celebrate" },
      motion: "jump",
      wave: "celebrate",
    });
  });

  it("bravo balança a cabeça; preocupado não", () => {
    expect(reactionTo({ type: "upset", mood: "grumpy" })).toMatchObject({
      clear: ["celebrate", "typing"],
      stopGestures: true,
      lookAtTarget: true,
      motion: "shake",
    });
    expect(reactionTo({ type: "upset", mood: "worried" }).motion).toBeUndefined();
  });

  it("dúvida liga e desliga; aceno só mexe a cabeça e a mão", () => {
    expect(reactionTo({ type: "doubt", active: true }).set?.expression).toBe("skeptical");
    expect(reactionTo({ type: "doubt", active: false }).unset).toBe("doubt");
    expect(reactionTo({ type: "nod" })).toEqual({ clear: [], motion: "nod", wave: "simple" });
  });
});

describe("par da home", () => {
  it("atividade de cada fase; abrindo a sala, os dois esperam", () => {
    expect(pairActivity("approach", false)).toBe("walking");
    expect(pairActivity("hit", false)).toBe("greeting");
    expect(pairActivity("rest", false)).toBe("idle");
    expect(pairActivity("hit", true)).toBe("waiting");
  });
});
