import assert from "node:assert/strict";
import { test } from "vitest";

const { ADMIN_SESSION_MS, createSessionToken, passwordMatches, verifySessionToken } =
  await import("../../server/auth/admin-password");

const SECRET = "segredo-de-sessao-0123456789abcdef0123456789";
const NOW = 1_800_000_000_000;

test("senha: só a exata confere", () => {
  assert.equal(passwordMatches("senha-correta-123", "senha-correta-123"), true);
  assert.equal(passwordMatches("senha-correta-12", "senha-correta-123"), false);
  assert.equal(passwordMatches("", "senha-correta-123"), false);
});

test("sessão: vale até expirar", () => {
  const token = createSessionToken(SECRET, NOW);
  assert.equal(verifySessionToken(token, SECRET, NOW + 1000), true);
  assert.equal(verifySessionToken(token, SECRET, NOW + ADMIN_SESSION_MS), false);
});

test("sessão: recusa outro segredo, validade alterada e lixo", () => {
  const token = createSessionToken(SECRET, NOW);
  const [, signature] = token.split(".");
  assert.equal(verifySessionToken(token, `${SECRET}x`, NOW), false);
  // Estender a validade invalida a assinatura.
  assert.equal(
    verifySessionToken(`${NOW + 10 * ADMIN_SESSION_MS}.${signature}`, SECRET, NOW),
    false,
  );
  for (const junk of [undefined, "", "abc", `${NOW}`, `${NOW}.`, `.${signature}`, `${token}.x`]) {
    assert.equal(verifySessionToken(junk, SECRET, NOW), false, String(junk));
  }
});
