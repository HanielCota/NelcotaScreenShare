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

/** Owner invitation written straight to the database (as create-owner does). */
async function ownerInvitation(email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql(
    `insert into admin_invitations (email, role, token_hash, expires_at)
     values ($1, 'owner', $2, now() + interval '30 minutes')`,
    [email, createHash("sha256").update(token).digest("hex")],
  );
  return token;
}

test("admin panel: invitation, sign-in with required 2FA, room filter and CSV export", async ({
  browser,
}) => {
  const email = `dono.${Date.now()}@exemplo.dev`;
  const token = await ownerInvitation(email);
  const roomCode = `painel-${Date.now().toString(36)}`;
  const otherCode = `outra-${Date.now().toString(36)}`;
  await sql("insert into rooms (code) values ($1)", [roomCode]);
  await sql("insert into rooms (code) values ($1)", [otherCode]);
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

  // Owner without 2FA: the panel goes straight to enabling it.
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

  // Same mounted table, a browser-history navigation with a different nonempty search value.
  await page.evaluate((code) => {
    const url = new URL(window.location.href);
    url.searchParams.set("q", code);
    const current = window.history.state as { idx?: number };
    const state = { ...current, idx: (current.idx ?? 0) + 1, key: "filter-history" };
    window.history.pushState(state, "", url);
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, otherCode);
  await expect(page.getByRole("searchbox").first()).toHaveValue(otherCode);
  await expect(page.getByRole("cell", { name: otherCode })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("searchbox").first()).toHaveValue(roomCode);
  await expect(page.getByRole("cell", { name: roomCode })).toBeVisible();

  // Search uses a GET loader and discards stale responses while typing.
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Ir para…, código da sala ou nome de alguém").fill(roomCode);
  await expect(page.getByRole("option", { name: new RegExp(roomCode) })).toBeVisible();
  const blocked = Promise.withResolvers<void>();
  const searchPattern = /\/api\/operations\/admin-search-searchPanelAction/;
  await page.route(searchPattern, async (route) => {
    await blocked.promise;
    await route.continue();
  });
  const arriving = page.waitForRequest(searchPattern);
  await page.getByPlaceholder("Ir para…, código da sala ou nome de alguém").fill(otherCode);
  try {
    await arriving;
    await expect(page.getByRole("option", { name: new RegExp(roomCode) })).toBeHidden();
  } finally {
    blocked.resolve();
  }
  await expect(page.getByRole("option", { name: new RegExp(otherCode) })).toBeVisible();
  await page.unroute(searchPattern);
  await page.keyboard.press("Escape");

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Exportar CSV/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);

  // Room detail: summary, people and screen shares.
  await page.getByRole("link", { name: roomCode }).click();
  await expect(page.getByRole("heading", { name: roomCode })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
  await expect(page.getByText("Ninguém entrou nesta sala.")).toBeVisible();
  await expect(page.getByText("Ninguém compartilhou a tela.")).toBeVisible();

  const audit = await sql("select count(*)::int as n from audit_logs where action = 'room.export'");
  expect(audit.rows[0]).toEqual({ n: 1 });

  // Participant detail: account, sessions, participations and history.
  await sql(`insert into users (name, email, email_verified) values ('Pessoa Painel', $1, true)`, [
    `pessoa.${Date.now()}@exemplo.dev`,
  ]);
  await page.goto("/admin/usuarios");
  await page.getByRole("link", { name: "Pessoa Painel" }).click();
  await expect(page.getByRole("heading", { name: "Pessoa Painel" })).toBeVisible();
  await expect(page.getByText("Ainda não entrou em nenhuma sala.")).toBeVisible();
  await expect(page.getByText("Nenhuma ação do painel nesta conta.")).toBeVisible();

  // A mutation revalidates the page and the root without reloading the document.
  await page.goto("/admin/configuracoes");
  const saturation = page.getByRole("slider", { name: "Tema escuro" });
  await saturation.focus();
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo. Novas páginas já abrem com a saturação nova.")).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("--mascot-saturation-dark", "0.95");
  await page.reload();
  await expect(saturation).toHaveAttribute("aria-valuenow", "0.95");
  await page.getByRole("button", { name: "Restaurar original" }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator("html")).toHaveCSS("--mascot-saturation-dark", "1");
  await context.close();
});
