import { z } from "zod";

/**
 * Mensagens trocadas pelo canal de dados do LiveKit. Chegam de outros
 * navegadores, então tudo é validado antes de virar estado.
 */
export const TOPICS = {
  reaction: "nelcota.reaction",
  pointer: "nelcota.pointer",
} as const;

export const REACTIONS = ["👍", "👏", "😂", "❤️", "🎉", "😮"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const reactionSchema = z.object({ emoji: z.enum(REACTIONS) });

/** Ponto na tela compartilhada, em frações (0–1) da imagem do vídeo. */
export const pointerSchema = z.object({
  trackSid: z.string().min(1).max(64),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type PointerMessage = z.infer<typeof pointerSchema>;

/** Atributo do participante para "levantar a mão". */
export const HAND_ATTRIBUTE = "hand";

/** Limite do chat (o LiveKit aceita mais; mensagens longas atrapalham a leitura). */
export const CHAT_MAX_LENGTH = 500;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeMessage(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

export function decodeMessage<T>(payload: Uint8Array, schema: z.ZodType<T>): T | undefined {
  try {
    const parsed = schema.safeParse(JSON.parse(decoder.decode(payload)));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Limite no RECEPTOR: o remetente já espaça os envios, mas um cliente
 * modificado poderia inundar os outros. Aceita no máximo uma mensagem por
 * remetente a cada `minGapMs` (metade do intervalo de envio, folga para o
 * jitter da rede juntar duas mensagens legítimas).
 */
export function createReceiveThrottle(minGapMs: number, now: () => number = Date.now) {
  const last = new Map<string, number>();
  return function accept(sender: string): boolean {
    const time = now();
    const previous = last.get(sender);
    if (previous !== undefined && time - previous < minGapMs) return false;
    last.set(sender, time);
    return true;
  };
}
