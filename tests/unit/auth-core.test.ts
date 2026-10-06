import assert from "node:assert/strict";
import { describe, test } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";
import { formatDateTime, formatRelative } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import { emailHash, LOCKOUT, lockDurationMs } from "@/server/auth/lockout";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { can, statements, type PermissionRequest } from "@/server/auth/permissions";
import { ADMIN_ROLES, type AdminRole } from "@/server/auth/roles";

describe("senha", () => {
  test("argon2id com os parâmetros da OWASP e verificação", async () => {
    const hash = await hashPassword("uma-senha-bem-longa");
    assert.match(hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert.equal(await verifyPassword({ hash, password: "uma-senha-bem-longa" }), true);
    assert.equal(await verifyPassword({ hash, password: "outra" }), false);
    assert.equal(
      await verifyPassword({ hash: "lixo", password: "x" }),
      false,
      "hash inválido não lança",
    );
  });
});

describe("bloqueio por tentativas", () => {
  test("começa em 15 min na 5ª falha, dobra a cada 5 e para em 24 h", () => {
    assert.equal(lockDurationMs(4), 0);
    assert.equal(lockDurationMs(5), LOCKOUT.baseLockMs);
    assert.equal(lockDurationMs(10), LOCKOUT.baseLockMs * 2);
    assert.equal(lockDurationMs(15), LOCKOUT.baseLockMs * 4);
    assert.equal(lockDurationMs(500), LOCKOUT.maxLockMs);
  });

  test("hash do e-mail ignora maiúsculas/espaços e separa admin de participante", () => {
    const secret = "segredo-0123456789abcdef0123456789";
    assert.equal(
      emailHash(secret, "admin", " Ana@Exemplo.com "),
      emailHash(secret, "admin", "ana@exemplo.com"),
    );
    assert.notEqual(
      emailHash(secret, "admin", "ana@exemplo.com"),
      emailHash(secret, "user", "ana@exemplo.com"),
    );
    assert.doesNotMatch(emailHash(secret, "admin", "ana@exemplo.com"), /ana/);
  });
});

describe("matriz de permissões (docs/PLANO-ADMIN.md §5.2)", () => {
  // Esperado por papel: [recurso, ação] permitidos. Todo o resto é negado.
  const expected: Record<AdminRole, string[]> = {
    owner: Object.entries(statements).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}.${action}`),
    ),
    admin: [
      "user.list",
      "user.get",
      "dashboard.read",
      "participant.read",
      "participant.update",
      "participant.delete",
      "participant.export",
      "room.read",
      "room.update",
      "room.delete",
      "room.export",
      "shareSession.read",
      "shareSession.export",
      "live.read",
      "live.kick",
      "live.close",
      "roomInvite.create",
      "roomInvite.revoke",
      "audit.read",
      "settings.read",
      "lgpd.read",
    ],
    viewer: ["dashboard.read", "participant.read", "room.read", "shareSession.read", "live.read"],
  };

  for (const role of ADMIN_ROLES) {
    test(`${role}: cada ação do catálogo bate com a matriz`, () => {
      for (const [resource, actions] of Object.entries(statements)) {
        for (const action of actions) {
          const request = { [resource]: [action] } as PermissionRequest;
          assert.equal(
            can(role, request),
            expected[role].includes(`${resource}.${action}`),
            `${role} ${resource}.${action}`,
          );
        }
      }
    });
  }

  test("ninguém impersona, apaga admin nem define senha de outro", () => {
    for (const role of ADMIN_ROLES) {
      for (const action of ["impersonate", "delete", "set-password", "set-email"]) {
        // Ações fora do catálogo: o controle de acesso nega.
        assert.equal(
          can(role, { user: [action] } as unknown as PermissionRequest),
          false,
          `${role} user.${action}`,
        );
      }
    }
  });
});

describe("mensagens e formatação", () => {
  test("erros do login não revelam se o e-mail existe", () => {
    assert.equal(
      authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 }),
      "E-mail ou senha incorretos.",
    );
    assert.equal(
      authErrorMessage({ status: 429, message: "Muitas tentativas. Tente de novo em 15 min." }),
      "Muitas tentativas. Tente de novo em 15 min.",
    );
    assert.equal(
      authErrorMessage({ status: 429, message: "Too many requests" }),
      "Muitas tentativas. Aguarde um minuto.",
    );
    assert.equal(
      authErrorMessage({ code: "QUALQUER", status: 500 }),
      "Algo deu errado. Tente de novo.",
    );
  });

  test("user agent legível", () => {
    assert.equal(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      ),
      "Chrome no Windows",
    );
    assert.equal(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      ),
      "Safari no iOS",
    );
    assert.equal(describeUserAgent(null), "Dispositivo desconhecido");
  });

  test("datas no fuso de São Paulo, inclusive na virada do dia", () => {
    // 02:30 UTC de 07/10 ainda é 06/10 em São Paulo (UTC−3).
    assert.equal(formatDateTime("2026-10-07T02:30:00Z"), "06/10/2026, 23:30");
    const now = Date.parse("2026-10-06T12:00:00Z");
    assert.equal(formatRelative(now - 5 * 60_000, now), "há 5 minutos");
    assert.equal(formatRelative(now - 12_000, now), "agora mesmo");
    assert.equal(formatRelative(now - 86_400_000, now), "ontem");
  });
});
