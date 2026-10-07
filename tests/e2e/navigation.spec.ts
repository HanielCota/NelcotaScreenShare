import { expect, test } from "@playwright/test";
import { newParticipant, newRoomCode, newVisitor, joinRoom } from "./support/session";

test("páginas gerais e de acesso têm uma única navbar, inclusive no celular", async ({
  browser,
}) => {
  const { page, context } = await newVisitor(browser);
  for (const path of ["/", "/entrar", "/cadastro", "/privacidade", "/pagina-inexistente"]) {
    await page.goto(path);
    const navbar = page.getByRole("navigation", { name: "Principal", exact: true });
    await expect(navbar).toHaveCount(1);
    await expect(navbar.getByRole("link", { name: "Nelcota, início", exact: true })).toBeVisible();
    await expect(navbar.getByRole("button", { name: /Ativar modo/ })).toBeVisible();
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Principal", exact: true }).getByRole("link", {
      name: "Entrar",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await context.close();
});

test("pré-entrada preserva a volta da conta e a chamada usa só a barra da sala", async ({
  browser,
}) => {
  const { page, context } = await newParticipant(browser, "Navegacao Teste");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const code = newRoomCode();
  await page.goto(`/sala/${code}`);
  const navbar = page.getByRole("navigation", { name: "Principal", exact: true });
  const account = navbar.getByRole("link", { name: "Minha conta", exact: true });
  await expect(account).toHaveAttribute(
    "href",
    `/conta?voltar=${encodeURIComponent(`/sala/${code}`)}`,
  );
  await expect(
    page.getByRole("heading", { name: "Pronto para entrar?", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("prejoin-desktop.png"), fullPage: true });
  await account.click();
  await expect(page.getByRole("heading", { name: "Navegacao Teste", exact: true })).toBeVisible();
  await expect(navbar).toHaveCount(1);
  await expect(navbar.getByRole("link", { name: "Minha conta", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("link", { name: "Voltar para a sala", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/sala/${code}$`));
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(account).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: test.info().outputPath("prejoin-mobile.png"), fullPage: true });
  await joinRoom(page, code, { micOn: false });
  await expect(navbar).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Sala", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: /Sair/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Você saiu da sala", exact: true })).toBeVisible();
  await expect(navbar).toHaveCount(1);
  await expect(account).toBeVisible();
  await context.close();
});
