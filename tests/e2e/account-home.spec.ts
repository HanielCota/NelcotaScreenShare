import { expect, test } from "@playwright/test";
import { E2E_URL } from "./support/env";
import { newVisitor, PASSWORD } from "./support/session";

test("cadastro pela tela, conta e encerrar a outra sessão", async ({ browser }) => {
  const { page, context } = await newVisitor(browser);
  const email = `gil.${Date.now()}@exemplo.dev`;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gil Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(`${E2E_URL}/`);

  // Uma segunda sessão (outro "dispositivo") para encerrar pela conta.
  const other = await newVisitor(browser);
  const signIn = await other.context.request.post("/api/auth/sign-in/email", {
    data: { email, password: PASSWORD },
    headers: { origin: E2E_URL },
  });
  expect(signIn.ok()).toBe(true);

  await page.goto("/conta");
  await expect(page.getByRole("button", { name: "Encerrar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Encerrar todas as outras" }).click();
  await expect(page.getByRole("button", { name: "Encerrar", exact: true })).toHaveCount(0);

  const session = await other.context.request.get("/api/auth/get-session");
  expect(await session.json()).toBeNull();
  await other.context.close();
  await context.close();
});

test("home: código inválido deixa o mascote bravo; código válido abre a sala", async ({
  browser,
}) => {
  const { page, context } = await newVisitor(browser);
  await page.goto("/");
  const input = page.getByPlaceholder("Link ou código da sala");
  await page.keyboard.press("/");
  await expect(input).toBeFocused();

  await input.fill("!!");
  await input.press("Enter");
  await expect(page.locator('[data-expression="grumpy"]').first()).toBeVisible();

  await input.fill("abc-defg-hij");
  await input.press("Enter");
  // Sem conta: a sala pede login e volta para ela depois.
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Fsala%2Fabc-defg-hij/);
  await context.close();
});
