import { expect, test } from "@playwright/test";
import { newVisitor } from "./support/session";

/**
 * Observable mascot behavior (data-expression on the root), locked in before
 * refactoring the engine (use-mascot). The clock is controlled by the test.
 */
test("falls asleep without activity and wakes up when the person types", async ({ browser }) => {
  const { page, context } = await newVisitor(browser);
  await page.clock.install();
  await page.goto("/entrar");
  const mascot = page.locator("[data-expression]").first();
  await expect(mascot).toBeVisible();

  // Advance in steps: a quirk (sneeze) along the way resets the sleep countdown.
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

test("an invalid code on the home page makes the mascot grumpy, then it calms down", async ({
  browser,
}) => {
  const { page, context } = await newVisitor(browser);
  await page.clock.install();
  await page.goto("/");
  const input = page.getByPlaceholder("Link ou código da sala").first();
  await input.fill("!!");
  await input.press("Enter");
  const grumpy = page.locator('[data-expression="grumpy"]');
  await expect(grumpy.first()).toBeVisible();
  await page.clock.fastForward(10_000);
  await expect(grumpy).toHaveCount(0);
  await context.close();
});
