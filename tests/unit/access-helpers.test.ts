import assert from "node:assert/strict";
import { test } from "vitest";
import { accessContext } from "@/features/auth/domain/access-context";
import { mascotLine } from "@/features/auth/domain/access-copy";
import { inboxLink, suggestEmail } from "@/features/auth/domain/email-suggest";
import { passwordStrength } from "@/features/auth/domain/password-rules";

test("suggests the closest common domain, and only when it looks like a typo", () => {
  assert.equal(suggestEmail("ana@gmial.com"), "ana@gmail.com");
  assert.equal(suggestEmail("ana@hotmal.com"), "ana@hotmail.com");
  assert.equal(suggestEmail("ana@outlok.com.br"), "ana@outlook.com.br");
  assert.equal(suggestEmail("ana@gmail.com"), undefined, "correct domain");
  assert.equal(suggestEmail("ana@empresa.com.br"), undefined, "custom domain");
  assert.equal(suggestEmail("sem-arroba"), undefined);
});

test("inbox shortcut only for known providers", () => {
  assert.equal(inboxLink("a@gmail.com")?.label, "Abrir o Gmail");
  assert.equal(inboxLink("a@hotmail.com.br")?.label, "Abrir o Outlook");
  assert.equal(inboxLink("a@empresa.com"), undefined);
});

test("password strength: length rules, personal data lowers it", () => {
  const min = 10;
  assert.equal(passwordStrength("curta", { min }), 0);
  assert.equal(passwordStrength("aaaaaaaaaaaa", { min }), 1, "low variety");
  assert.equal(passwordStrength("joana-silva-2026", { min, personal: ["Joana"] }), 1);
  assert.equal(
    passwordStrength("rita-teste-1", { min, personal: ["Rita Teste"] }),
    1,
    "word from the name",
  );
  assert.equal(
    passwordStrength("bolinha-azul-77", { min, personal: ["bolinha77"] }),
    3,
    "a whole e-mail is not a word",
  );
  assert.equal(passwordStrength("girassol-azul", { min }), 2);
  assert.equal(passwordStrength("Girassol-Azul-29", { min }), 3);
});

test("access screen context from the return destination", () => {
  assert.deepEqual(accessContext("/sala/kfa-mtrx-q2p"), {
    kind: "room",
    code: "kfa-mtrx-q2p",
    invited: false,
  });
  assert.deepEqual(accessContext("/sala/kfa-mtrx-q2p?convite=abc"), {
    kind: "room",
    code: "kfa-mtrx-q2p",
    invited: true,
  });
  assert.deepEqual(accessContext("/conta"), { kind: "app" });
  assert.deepEqual(accessContext("/sala/%E0%A4%A"), { kind: "app" }, "malformed code");
  assert.deepEqual(accessContext("/sala/A B"), { kind: "app" });
});

test("mascot line follows the screen and the room", () => {
  assert.equal(mascotLine("/entrar", null), "Que bom te ver de novo.");
  assert.equal(
    mascotLine("/entrar", "/sala/kfa-mtrx-q2p"),
    "Entra para acessar a sala kfa-mtrx-q2p.",
  );
  assert.match(
    mascotLine("/entrar", "/sala/kfa-mtrx-q2p?convite=x"),
    /convite para a sala kfa-mtrx-q2p/,
  );
  assert.match(mascotLine("/cadastro", "/sala/kfa-mtrx-q2p"), /sala kfa-mtrx-q2p/);
  assert.equal(mascotLine("/cadastro", "/sala/<script>"), "É rapidinho: nome, e-mail e uma senha.");
  assert.match(mascotLine("/redefinir-senha", null), /Eu não olho/);
});
