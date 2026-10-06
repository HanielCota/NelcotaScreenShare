import { describe, expect, it, vi } from "vitest";
import {
  decideTokenRequest,
  type TokenAccount,
  type TokenDeps,
  type TokenPolicy,
} from "@/features/room/domain/issue-token";

const ANA: TokenAccount = { id: "ana", name: "Ana", blocked: false, emailVerified: true };
const OPEN: TokenPolicy = {
  requireVerifiedEmail: false,
  accessPassword: undefined,
  maxParticipants: 3,
};
const ok = { ok: true, retryAfterSeconds: 0 };

function deps(overrides: Partial<TokenDeps> = {}): TokenDeps {
  return {
    hitAccountLimit: () => ok,
    passwordFailures: { peek: () => ok, fail: vi.fn(), reset: vi.fn() },
    passwordMatches: (given) => given === "certa",
    countParticipants: () => Promise.resolve(0),
    redeemInvite: () => Promise.resolve(true),
    ...overrides,
  };
}

const body = (value: unknown) => ({ readable: true as const, value });
const messageOf = (decision: Awaited<ReturnType<typeof decideTokenRequest>>) =>
  decision.ok ? "" : decision.message;

describe("quem entra na sala", () => {
  it("conta logada e sala com vaga: entra com a identidade e o nome da conta", async () => {
    const decision = await decideTokenRequest(ANA, body({ room: "Sala-Teste" }), OPEN, deps());
    expect(decision).toEqual({
      ok: true,
      log: "granted",
      grant: { identity: "ana", name: "Ana", room: "sala-teste" },
    });
  });

  it("sem conta, bloqueada ou com e-mail não confirmado (quando exigido)", async () => {
    expect(await decideTokenRequest(null, body({ room: "sala" }), OPEN, deps())).toMatchObject({
      error: "unauthenticated",
      log: "unauthenticated",
    });
    const blocked = { ...ANA, blocked: true };
    expect(await decideTokenRequest(blocked, body({ room: "sala" }), OPEN, deps())).toMatchObject({
      error: "blocked",
    });
    const unverified = { ...ANA, emailVerified: false };
    expect(
      await decideTokenRequest(unverified, body({ room: "sala" }), OPEN, deps()),
    ).toMatchObject({ ok: true });
    expect(
      await decideTokenRequest(
        unverified,
        body({ room: "sala" }),
        { ...OPEN, requireVerifiedEmail: true },
        deps(),
      ),
    ).toMatchObject({ error: "email_unverified", log: "unverified" });
  });

  it("limite por conta vem antes de olhar o pedido", async () => {
    const decision = await decideTokenRequest(
      ANA,
      { readable: false },
      OPEN,
      deps({ hitAccountLimit: () => ({ ok: false, retryAfterSeconds: 42 }) }),
    );
    expect(decision).toMatchObject({ error: "rate_limited", retryAfterSeconds: 42 });
  });

  it("pedido ilegível ou inválido diz qual campo conferir", async () => {
    const unreadable = await decideTokenRequest(ANA, { readable: false }, OPEN, deps());
    expect(unreadable).toMatchObject({ error: "invalid_request", log: "invalid" });
    expect(messageOf(unreadable)).toContain("ler os dados");
    expect(messageOf(await decideTokenRequest(ANA, body({ room: "!!" }), OPEN, deps()))).toContain(
      "código da sala",
    );
    const longPassword = body({ room: "sala", password: "x".repeat(200) });
    expect(messageOf(await decideTokenRequest(ANA, longPassword, OPEN, deps()))).toContain(
      "no máximo 128",
    );
  });

  it("senha de acesso: errada conta falha, certa zera, convite dispensa", async () => {
    const policy = { ...OPEN, accessPassword: "certa" };
    const failures = { peek: () => ok, fail: vi.fn(), reset: vi.fn() };
    const wrong = await decideTokenRequest(
      ANA,
      body({ room: "sala", password: "errada" }),
      policy,
      deps({ passwordFailures: failures }),
    );
    expect(wrong).toMatchObject({ error: "invalid_password", log: "wrong_password" });
    expect(failures.fail).toHaveBeenCalledOnce();

    const right = await decideTokenRequest(
      ANA,
      body({ room: "sala", password: "certa" }),
      policy,
      deps({ passwordFailures: failures }),
    );
    expect(right.ok).toBe(true);
    expect(failures.reset).toHaveBeenCalledOnce();

    const withInvite = await decideTokenRequest(
      ANA,
      body({ room: "sala", invite: "convite" }),
      policy,
      deps(),
    );
    expect(withInvite.ok).toBe(true);
  });

  it("senha errada demais: espera, mesmo acertando", async () => {
    const decision = await decideTokenRequest(
      ANA,
      body({ room: "sala", password: "certa" }),
      { ...OPEN, accessPassword: "certa" },
      deps({
        passwordFailures: {
          peek: () => ({ ok: false, retryAfterSeconds: 900 }),
          fail: vi.fn(),
          reset: vi.fn(),
        },
      }),
    );
    expect(decision).toMatchObject({ error: "rate_limited", retryAfterSeconds: 900 });
  });

  it("sala cheia não gasta o convite; convite inválido é recusado", async () => {
    const redeemInvite = vi.fn(() => Promise.resolve(true));
    const full = await decideTokenRequest(
      ANA,
      body({ room: "sala", invite: "convite" }),
      OPEN,
      deps({ countParticipants: () => Promise.resolve(3), redeemInvite }),
    );
    expect(full).toMatchObject({ error: "room_full" });
    expect(messageOf(full)).toContain("3 pessoas");
    expect(redeemInvite).not.toHaveBeenCalled();

    const invalid = await decideTokenRequest(
      ANA,
      body({ room: "sala", invite: "vencido" }),
      OPEN,
      deps({ redeemInvite: () => Promise.resolve(false) }),
    );
    expect(invalid).toMatchObject({ error: "invite_invalid", log: "invite_invalid" });
  });

  it('falha do LiveKit sobe para quem chamou (vira "sala indisponível")', async () => {
    await expect(
      decideTokenRequest(
        ANA,
        body({ room: "sala" }),
        OPEN,
        deps({ countParticipants: () => Promise.reject(new Error("LiveKit fora")) }),
      ),
    ).rejects.toThrow("LiveKit fora");
  });
});
