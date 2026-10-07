import {
  tokenErrorSchema,
  tokenResponseSchema,
  type TokenErrorCode,
  type TokenRequest,
  type TokenResponse,
} from "@/features/room/domain/token-contract";

/** Result of the token request in the browser (not to be confused with the token_requests record). */
export type TokenFetchResult =
  | { ok: true; data: TokenResponse }
  | { ok: false; code: TokenErrorCode | "network_error"; message: string };

/** Requests a token from the backend. Runs in the browser; the secret stays on the server. */
export async function requestToken(input: TokenRequest): Promise<TokenFetchResult> {
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

/** Raises or lowers the hand (the server writes the attribute; see /api/sala/mao). */
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
