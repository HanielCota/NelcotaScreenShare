import { z } from "zod";

/** Código de sala: minúsculas, números e hífens (ex.: "abc-defg-hij"). */
export const roomCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/,
    "Confira o código da sala. Use letras, números e hífens, como kfa-mtrx-q2p.",
  );

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Maior múltiplo do tamanho do alfabeto que cabe em um byte: acima dele, o módulo teria viés. */
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

function randomChunk(length: number): string {
  let chunk = "";
  while (chunk.length < length) {
    const [byte] = crypto.getRandomValues(new Uint8Array(1));
    if (byte !== undefined && byte < UNBIASED_LIMIT) chunk += ALPHABET[byte % ALPHABET.length];
  }
  return chunk;
}

/** Gera um código fácil de ditar, no estilo "kfa-mtrx-q2p". */
export function generateRoomCode(): string {
  return `${randomChunk(3)}-${randomChunk(4)}-${randomChunk(3)}`;
}

/** Segmento da URL decodificado; `undefined` se a codificação for inválida (ex.: "%E0"). */
export function decodeRoomParam(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

export function roomPath(code: string): string {
  return `/sala/${encodeURIComponent(code)}`;
}

/** Link da sala com o convite do painel (quando houver). */
export function roomLink(code: string, invite?: string): string {
  return invite ? `${roomPath(code)}?convite=${encodeURIComponent(invite)}` : roomPath(code);
}
