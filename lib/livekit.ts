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

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Digite seu nome para entrar na sala.")
  .max(32, "Seu nome pode ter até 32 caracteres. Use um nome mais curto.");

/** O nome e a identidade vêm da conta logada (servidor), nunca do navegador. */
export const tokenRequestSchema = z.object({
  room: roomCodeSchema,
  password: z.string().max(128).optional(),
  /** Token de convite do painel (?convite= no link da sala). */
  invite: z.string().max(64).optional(),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;

export const tokenResponseSchema = z.object({
  token: z.string(),
  serverUrl: z.string(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const tokenErrorSchema = z.object({
  error: z.enum([
    "invalid_request",
    "unauthenticated",
    "email_unverified",
    "blocked",
    "cross_site",
    "invalid_password",
    "invite_invalid",
    "room_full",
    "rate_limited",
    "server_error",
  ]),
  message: z.string(),
});

export type TokenErrorCode = z.infer<typeof tokenErrorSchema>["error"];

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

export type TokenResult =
  | { ok: true; data: TokenResponse }
  | { ok: false; code: TokenErrorCode | "network_error"; message: string };

/** Pede um token ao backend. Roda no navegador; o segredo fica no servidor. */
export async function requestToken(input: TokenRequest): Promise<TokenResult> {
  let response: Response;
  try {
    response = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: "Não foi possível entrar na sala. Verifique sua internet e tente novamente.",
    };
  }

  const json: unknown = await response.json().catch(() => null);

  if (response.ok) {
    const parsed = tokenResponseSchema.safeParse(json);
    if (parsed.success) return { ok: true, data: parsed.data };
  }

  const error = tokenErrorSchema.safeParse(json);
  if (error.success) return { ok: false, code: error.data.error, message: error.data.message };
  return {
    ok: false,
    code: "server_error",
    message: "Não foi possível concluir sua entrada. Aguarde alguns segundos e tente novamente.",
  };
}

/** Levanta ou baixa a mão (o servidor grava o atributo; ver /api/sala/mao). */
export async function setHandRaised(room: string, raised: boolean): Promise<boolean> {
  try {
    const response = await fetch("/api/sala/mao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, raised }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function roomPath(code: string): string {
  return `/sala/${encodeURIComponent(code)}`;
}

/** Link da sala com o convite do painel (quando houver). */
export function roomLink(code: string, invite?: string): string {
  return invite ? `${roomPath(code)}?convite=${encodeURIComponent(invite)}` : roomPath(code);
}
