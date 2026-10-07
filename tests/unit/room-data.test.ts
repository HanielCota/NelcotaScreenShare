import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contentBox,
  createReceiveThrottle,
  decodeMessage,
  encodeMessage,
  pointerSchema,
  reactionSchema,
  savedMicrophone,
  saveMicrophone,
} from "@/lib/room-data";

describe("mensagens do canal de dados", () => {
  it("ida e volta de uma reação válida", () => {
    expect(decodeMessage(encodeMessage({ emoji: "🎉" }), reactionSchema)).toEqual({ emoji: "🎉" });
  });

  it("descarta JSON inválido, emoji fora da lista e ponto fora da imagem", () => {
    expect(decodeMessage(new TextEncoder().encode("{oops"), reactionSchema)).toBeUndefined();
    expect(decodeMessage(encodeMessage({ emoji: "💣" }), reactionSchema)).toBeUndefined();
    expect(
      decodeMessage(encodeMessage({ trackSid: "TR_1", x: 1.2, y: 0.5 }), pointerSchema),
    ).toBeUndefined();
    expect(
      decodeMessage(encodeMessage({ trackSid: "", x: 0.2, y: 0.5 }), pointerSchema),
    ).toBeUndefined();
  });
});

describe("limite no receptor", () => {
  it("aceita uma mensagem por remetente a cada intervalo", () => {
    let now = 0;
    const accept = createReceiveThrottle(100, () => now);
    expect(accept("ana")).toBe(true);
    now = 50;
    expect(accept("ana")).toBe(false);
    expect(accept("bia")).toBe(true);
    now = 100;
    expect(accept("ana")).toBe(true);
  });
});

describe("área da imagem no vídeo", () => {
  it("tarjas laterais quando o vídeo é mais estreito", () => {
    expect(contentBox({ width: 200, height: 100 }, { width: 100, height: 100 })).toEqual({
      left: 50,
      top: 0,
      width: 100,
      height: 100,
    });
  });

  it("tarjas em cima e embaixo quando o vídeo é mais largo", () => {
    expect(contentBox({ width: 100, height: 100 }, { width: 200, height: 100 })).toEqual({
      left: 0,
      top: 25,
      width: 100,
      height: 50,
    });
  });

  it("vídeo ainda sem tamanho ocupa a caixa toda", () => {
    expect(contentBox({ width: 80, height: 60 }, { width: 0, height: 0 })).toEqual({
      left: 0,
      top: 0,
      width: 80,
      height: 60,
    });
  });
});

describe("microfone salvo", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lembra e esquece a escolha", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    saveMicrophone("mic-1");
    expect(savedMicrophone()).toBe("mic-1");
    saveMicrophone(undefined);
    expect(savedMicrophone()).toBeUndefined();
  });

  it("armazenamento bloqueado não quebra", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(() => saveMicrophone("mic-1")).not.toThrow();
    expect(savedMicrophone()).toBeUndefined();
  });
});
