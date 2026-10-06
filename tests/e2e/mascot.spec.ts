import { expect, test } from "@playwright/test";
import { newVisitor } from "./support/session";

/**
 * Comportamento observável do mascote (data-expression na raiz), travado antes
 * de refatorar o motor (use-mascot). O relógio é controlado pelo teste.
 */
test("dorme sem atividade e acorda quando a pessoa digita", async ({ browser }) => {
  const { page, context } = await newVisitor(browser);
  await page.clock.install();
  await page.goto("/entrar");
  const mascot = page.locator("[data-expression]").first();
  await expect(mascot).toBeVisible();

  // Avança em passos: uma peculiaridade (espirro) no meio reinicia a contagem do sono.
  await expect
    .poll(
      async () => {
        await page.clock.fastForward(15_000);
        return mascot.getAttribute("data-expression");
      },
      { timeout: 30_000, intervals: [100] },
    )
    .toBe("asleep");

  await page.getByLabel("E-mail").pressSequentially("ana@");
  await page.clock.fastForward(1_000);
  await expect(mascot).not.toHaveAttribute("data-expression", /asleep|sleepy/);
  await context.close();
});

test("código inválido na home deixa o mascote bravo e depois ele se acalma", async ({
  browser,
}) => {
  const { page, context } = await newVisitor(browser);
  await page.clock.install();
  await page.goto("/");
  const input = page.getByPlaceholder("Link ou código da sala");
  await input.fill("!!");
  await input.press("Enter");
  const grumpy = page.locator('[data-expression="grumpy"]');
  await expect(grumpy.first()).toBeVisible();
  await page.clock.fastForward(10_000);
  await expect(grumpy).toHaveCount(0);
  await context.close();
});
