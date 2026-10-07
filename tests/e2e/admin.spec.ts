import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { totpFromUri } from "../integration/support/totp";
import { newVisitor } from "./support/session";

const PASSWORD = "senha-forte-do-dono-e2e";

function e2eDatabaseUrl(): string {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  url.pathname = "/nelcota_e2e";
  return url.toString();
}

async function sql(text: string, values: unknown[] = []) {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

/** Convite de dono gravado direto no banco (como o create-owner faz). */
async function ownerInvitation(email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql(
    `insert into admin_invitations (email, role, token_hash, expires_at)
     values ($1, 'owner', $2, now() + interval '30 minutes')`,
    [email, createHash("sha256").update(token).digest("hex")],
  );
  return token;
}

test("painel: convite, login com 2FA obrigatório, filtro de salas e exportação CSV", async ({
  browser,
}) => {
  const email = `dono.${Date.now()}@exemplo.dev`;
  const token = await ownerInvitation(email);
  const roomCode = `painel-${Date.now().toString(36)}`;
  await sql("insert into rooms (code) values ($1)", [roomCode]);
  const { page, context } = await newVisitor(browser);

  await page.goto(`/admin/convite/${token}`);
  await page.getByLabel("Seu nome").fill("Dona do Painel");
  await page.getByLabel("Senha (mínimo de 12 caracteres)").fill(PASSWORD);
  await page.getByLabel("Repita a senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar acesso" }).click();
  await expect(page).toHaveURL(/\/admin\/entrar/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  // Dono sem 2FA: o painel leva direto para ativar.
  await expect(page).toHaveURL(/\/admin\/conta\/seguranca/);
  await page.getByLabel("Confirme sua senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Ativar verificação" }).click();
  const secret = (await page.locator("code").first().textContent())?.trim() ?? "";
  await page
    .getByLabel("Código do app")
    .fill(totpFromUri(`otpauth://totp/Nelcota?secret=${secret}`));
  await page.getByRole("button", { name: "Confirmar e ativar" }).click();
  await page.getByRole("button", { name: "Guardei os códigos" }).click();

  await page.goto("/admin/salas");
  await expect(page.getByRole("cell", { name: roomCode })).toBeVisible();
  await page.getByRole("searchbox").first().fill(roomCode);
  await expect(page).toHaveURL(new RegExp(`q=${roomCode}`));

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Exportar CSV/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);

  const audit = await sql("select count(*)::int as n from audit_logs where action = 'room.export'");
  expect(audit.rows[0]).toEqual({ n: 1 });
  await context.close();
});
