import { tokenRequestSchema, type TokenErrorCode } from "./token-contract";

/**
 * Who may join a room, in the order /api/token checks it. It is plain
 * TypeScript: database, LiveKit and attempt limits come in as functions, and every branch
 * has a test (tests/unit/issue-token.test.ts).
 */

/** Result recorded in token_requests (the database's `token_result` enum). */
type TokenLogResult =
  | "granted"
  | "wrong_password"
  | "room_full"
  | "rate_limited"
  | "blocked"
  | "unverified"
  | "unauthenticated"
  | "invalid"
  | "invite_invalid"
  | "error";

export interface TokenAccount {
  id: string;
  name: string;
  blocked: boolean;
  emailVerified: boolean;
}

export interface TokenPolicy {
  requireVerifiedEmail: boolean;
  /** Room access password (without it, anyone with an account can join). */
  accessPassword: string | undefined;
  maxParticipants: number;
}

interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface TokenDeps {
  /** Counts one attempt for the account (switching IP does not grant more attempts). */
  hitAccountLimit: (accountId: string) => LimitResult;
  /** Wrong password: checks, records and resets this IP's failures. */
  passwordFailures: { peek: () => LimitResult; fail: () => void; reset: () => void };
  /** Compares with the access password in constant time. */
  passwordMatches: (given: string) => boolean;
  countParticipants: (room: string) => Promise<number>;
  redeemInvite: (invite: string, room: string, accountId: string) => Promise<boolean>;
}

export interface TokenGrant {
  identity: string;
  name: string;
  room: string;
}

/** Refusals the decision can produce (the cross-origin one belongs to the HTTP edge). */
export type TokenRefusal = Exclude<TokenErrorCode, "cross_site">;

export type TokenDecision =
  | { ok: true; grant: TokenGrant; log: "granted" }
  | {
      ok: false;
      error: TokenRefusal;
      log: TokenLogResult;
      message: string;
      retryAfterSeconds?: number;
    };

/** HTTP status of each refusal (the body carries the code and the message). */
export const TOKEN_ERROR_STATUS: Record<TokenRefusal, number> = {
  unauthenticated: 401,
  blocked: 403,
  email_unverified: 403,
  rate_limited: 429,
  invalid_request: 400,
  invalid_password: 401,
  room_full: 409,
  invite_invalid: 403,
  server_error: 502,
};

export const SERVER_ERROR_MESSAGE =
  "A sala está indisponível no momento. Aguarde alguns segundos e tente de novo.";

function refuse(
  error: TokenRefusal,
  log: TokenLogResult,
  message: string,
  retryAfterSeconds?: number,
): TokenDecision {
  return {
    ok: false,
    error,
    log,
    message,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}

function invalidMessage(field: PropertyKey | undefined): string {
  if (field === "password")
    return "Confira a senha de acesso. Ela deve ter no máximo 128 caracteres.";
  if (field === "room") return "Confira o código da sala ou peça um novo convite a quem enviou.";
  return "Confira os dados de entrada e tente de novo.";
}

/** Account: signed in, active, with a verified email (if required) and within the limit. */
function checkAccount(
  account: TokenAccount | null,
  policy: TokenPolicy,
  deps: TokenDeps,
): TokenDecision | TokenAccount {
  if (!account) {
    return refuse(
      "unauthenticated",
      "unauthenticated",
      "Entre na sua conta para participar da sala.",
    );
  }
  if (account.blocked) {
    return refuse(
      "blocked",
      "blocked",
      "Sua conta não pode entrar em salas. Fale com o suporte se achar que é um engano.",
    );
  }
  if (policy.requireVerifiedEmail && !account.emailVerified) {
    return refuse(
      "email_unverified",
      "unverified",
      "Confirme seu e-mail para entrar em salas. Enviamos um link quando você criou a conta.",
    );
  }
  const limit = deps.hitAccountLimit(account.id);
  if (!limit.ok) {
    return refuse(
      "rate_limited",
      "rate_limited",
      "Muitas tentativas. Aguarde um pouco e tente de novo.",
      limit.retryAfterSeconds,
    );
  }
  return account;
}

/** Access password (when one exists and there is no invite, which replaces it). */
function checkPassword(password: string | undefined, deps: TokenDeps): TokenDecision | undefined {
  const failures = deps.passwordFailures.peek();
  if (!failures.ok) {
    return refuse(
      "rate_limited",
      "rate_limited",
      "Muitas tentativas com a senha errada. Aguarde alguns minutos e tente de novo.",
      failures.retryAfterSeconds,
    );
  }
  if (deps.passwordMatches(password ?? "")) {
    deps.passwordFailures.reset();
    return undefined;
  }
  deps.passwordFailures.fail();
  return refuse(
    "invalid_password",
    "wrong_password",
    "Essa senha não confere. Confira a senha com quem enviou o convite e tente de novo.",
  );
}

/**
 * Decides whether the account joins the room. `body` is the request JSON (`undefined` if
 * it could not be read). Throws only if LiveKit or the database fail (the caller
 * responds "room unavailable").
 */
export async function decideTokenRequest(
  account: TokenAccount | null,
  body: { readable: true; value: unknown } | { readable: false },
  policy: TokenPolicy,
  deps: TokenDeps,
): Promise<TokenDecision> {
  const checked = checkAccount(account, policy, deps);
  if ("ok" in checked) return checked;

  if (!body.readable) {
    return refuse(
      "invalid_request",
      "invalid",
      "Não foi possível ler os dados de entrada. Atualize a página e tente de novo.",
    );
  }
  const parsed = tokenRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return refuse("invalid_request", "invalid", invalidMessage(parsed.error.issues[0]?.path[0]));
  }
  const { room, password, invite } = parsed.data;

  // A dashboard invite replaces the access password (it is validated further below).
  if (policy.accessPassword && invite === undefined) {
    const wrong = checkPassword(password, deps);
    if (wrong) return wrong;
  }

  if ((await deps.countParticipants(room)) >= policy.maxParticipants) {
    return refuse(
      "room_full",
      "room_full",
      `A sala está cheia (máximo de ${policy.maxParticipants} pessoas). Aguarde alguém sair e tente de novo.`,
    );
  }
  // After the capacity check: a full room does not consume an invite use.
  if (invite !== undefined && !(await deps.redeemInvite(invite, room, checked.id))) {
    return refuse(
      "invite_invalid",
      "invite_invalid",
      "Este convite expirou, foi revogado ou já atingiu o limite de pessoas. Peça um novo a quem convidou.",
    );
  }
  return { ok: true, grant: { identity: checked.id, name: checked.name, room }, log: "granted" };
}
