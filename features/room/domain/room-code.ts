import { z } from "zod";

/**
 * Room code: lowercase letters, digits and hyphens (e.g. "abc-defg-hij"). The same
 * rule applies in the `rooms` table CHECK (server/db/schema/rooms.ts).
 */
export const ROOM_CODE_PATTERN = "^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$";

export const roomCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    new RegExp(ROOM_CODE_PATTERN),
    "Confira o código da sala. Use letras, números e hífens, como kfa-mtrx-q2p.",
  );

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Largest multiple of the alphabet size that fits in a byte: above it, the modulo would be biased. */
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

function randomChunk(length: number): string {
  let chunk = "";
  while (chunk.length < length) {
    const [byte] = crypto.getRandomValues(new Uint8Array(1));
    if (byte !== undefined && byte < UNBIASED_LIMIT) chunk += ALPHABET[byte % ALPHABET.length];
  }
  return chunk;
}

/** Generates a code that is easy to read aloud, in the style "kfa-mtrx-q2p". */
export function generateRoomCode(): string {
  return `${randomChunk(3)}-${randomChunk(4)}-${randomChunk(3)}`;
}

/** Decoded URL segment; `undefined` if the encoding is invalid (e.g. "%E0"). */
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

/** Room link with the dashboard invite (when there is one). */
export function roomLink(code: string, invite?: string): string {
  return invite ? `${roomPath(code)}?convite=${encodeURIComponent(invite)}` : roomPath(code);
}
