/**
 * Poses do atlas e valores animados do mascote verde-menta.
 *
 * Traços do rosto, cada um animado por mola até o valor da expressão:
 * - tilt: inclina a cabeça (graus)
 * - pupil: tamanho da pupila (menor = olhos arregalados)
 * - lid: quanto as pálpebras ficam fechadas (0 abertas, 1 fechadas)
 * - rest: quanto o corpo se acomoda e achata para dormir
 */
export const EXPRESSIONS = {
  neutral: { tilt: 0, pupil: 1, lid: 0, rest: 0 },
  happy: { tilt: 0, pupil: 1, lid: 0, rest: 0 },
  celebrate: { tilt: 0, pupil: 1.05, lid: 0, rest: 0 },
  grumpy: { tilt: 0, pupil: 1, lid: 0.42, rest: 0 },
  worried: { tilt: 0, pupil: 1, lid: 0.1, rest: 0 },
  surprised: { tilt: 0, pupil: 0.68, lid: 0, rest: 0 },
  skeptical: { tilt: -7, pupil: 1, lid: 0.18, rest: 0 },
  sleepy: { tilt: 3, pupil: 1, lid: 0.6, rest: 0.35 },
  asleep: { tilt: 7, pupil: 1, lid: 1, rest: 1 },
} as const;

export type Expression = keyof typeof EXPRESSIONS;
export type Face = { -readonly [K in keyof (typeof EXPRESSIONS)["neutral"]]: number };
/** Estado animado: como Face, mas com uma pálpebra por olho (pra espiar com um olho só). */
export type FaceState = Omit<Face, "lid"> & { lid0: number; lid1: number };

/** Quando duas reações acontecem juntas, a que vem primeiro nesta lista aparece. */
export const PRIORITY: readonly Expression[] = [
  // Qualquer interação remove o sono; enquanto inativo, ele pode relaxar até com Caps Lock ligado.
  "asleep",
  "sleepy",
  "celebrate",
  "grumpy",
  "worried",
  "surprised",
  "skeptical",
  "happy",
];

/** Expressão com uma pálpebra por olho; `lids` substitui a da expressão (ex.: senha). */
export function toFaceState({ lid, ...face }: Face, lids?: readonly [number, number]): FaceState {
  return { ...face, lid0: lids?.[0] ?? lid, lid1: lids?.[1] ?? lid };
}
