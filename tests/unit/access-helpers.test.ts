import assert from "node:assert/strict";
import { test } from "vitest";
import { accessContext } from "@/lib/access-context";
import { mascotLine } from "@/lib/access-copy";
import { inboxLink, suggestEmail } from "@/lib/email-suggest";
import { passwordStrength } from "@/lib/password-rules";

test("sugere o domínio comum mais próximo, e só quando parece erro", () => {
  assert.equal(suggestEmail("ana@gmial.com"), "ana@gmail.com");
  assert.equal(suggestEmail("ana@hotmal.com"), "ana@hotmail.com");
  assert.equal(suggestEmail("ana@outlok.com.br"), "ana@outlook.com.br");
  assert.equal(suggestEmail("ana@gmail.com"), undefined, "domínio certo");
  assert.equal(suggestEmail("ana@empresa.com.br"), undefined, "domínio próprio");
  assert.equal(suggestEmail("sem-arroba"), undefined);
});

test("atalho para a caixa de entrada só nos provedores conhecidos", () => {
  assert.equal(inboxLink("a@gmail.com")?.label, "Abrir o Gmail");
  assert.equal(inboxLink("a@hotmail.com.br")?.label, "Abrir o Outlook");
  assert.equal(inboxLink("a@empresa.com"), undefined);
});

test("força da senha: tamanho manda, dados pessoais derrubam", () => {
  const min = 10;
  assert.equal(passwordStrength("curta", { min }), 0);
  assert.equal(passwordStrength("aaaaaaaaaaaa", { min }), 1, "pouca variedade");
  assert.equal(passwordStrength("joana-silva-2026", { min, personal: ["Joana"] }), 1);
  assert.equal(
    passwordStrength("rita-teste-1", { min, personal: ["Rita Teste"] }),
    1,
    "palavra do nome",
  );
  assert.equal(
    passwordStrength("bolinha-azul-77", { min, personal: ["bolinha77"] }),
    3,
    "e-mail inteiro não é palavra",
  );
  assert.equal(passwordStrength("girassol-azul", { min }), 2);
  assert.equal(passwordStrength("Girassol-Azul-29", { min }), 3);
});

test("contexto da tela de acesso pelo destino de volta", () => {
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
  assert.deepEqual(accessContext("/sala/%E0%A4%A"), { kind: "app" }, "código malformado");
  assert.deepEqual(accessContext("/sala/A B"), { kind: "app" });
});

test("fala do mascote acompanha a tela e a sala", () => {
  assert.equal(mascotLine("/entrar", null), "Que bom te ver de novo.");
  assert.equal(
    mascotLine("/entrar", "/sala/kfa-mtrx-q2p"),
    "A sala kfa-mtrx-q2p já está te esperando.",
  );
  assert.match(
    mascotLine("/entrar", "/sala/kfa-mtrx-q2p?convite=x"),
    /convite para a sala kfa-mtrx-q2p/,
  );
  assert.match(mascotLine("/cadastro", "/sala/kfa-mtrx-q2p"), /sala kfa-mtrx-q2p/);
  assert.equal(mascotLine("/cadastro", "/sala/<script>"), "É rapidinho: nome, e-mail e uma senha.");
  assert.match(mascotLine("/redefinir-senha", null), /Eu não olho/);
});
