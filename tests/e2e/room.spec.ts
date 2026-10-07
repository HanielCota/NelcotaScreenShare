import { expect, test, type Page } from "@playwright/test";
import { joinRoom, newParticipant, newRoomCode, newVisitor } from "./support/session";

/** Tela compartilhada falsa: um canvas animado no lugar do seletor do navegador. */
async function fakeScreenCapture(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      let frame = 0;
      setInterval(() => {
        frame += 1;
        if (!context) return;
        context.fillStyle = frame % 2 ? "#3a7" : "#173";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }, 100);
      return Promise.resolve(canvas.captureStream(15));
    };
  });
}

test.describe("acesso à sala", () => {
  test("sem conta vai para o login e volta para a sala (código normalizado)", async ({
    browser,
  }) => {
    const { page, context } = await newVisitor(browser);
    await page.goto("/sala/ABC-DEFG-HIJ");
    await expect(page).toHaveURL(/\/entrar\?voltar=%2Fsala%2Fabc-defg-hij/);
    await context.close();
  });

  test("código inválido volta para a home com aviso", async ({ browser }) => {
    const { page, context } = await newVisitor(browser);
    await page.goto("/sala/!!");
    await expect(page).toHaveURL(/\/\?erro=codigo/);
    await context.close();
  });
});

test.describe("pré-entrada", () => {
  test("senha errada mostra o erro no campo", async ({ browser }) => {
    const ana = await newParticipant(browser, "Ana Teste");
    await ana.page.goto(`/sala/${newRoomCode()}`);
    await ana.page.getByLabel("Senha da sala (quem te convidou sabe)").fill("errada");
    await ana.page.getByRole("button", { name: /Entrar na sala|Entrar só ouvindo/ }).click();
    await expect(ana.page.getByText("Essa senha não confere")).toBeVisible();
    await ana.context.close();
  });

  test("microfone desligado entra só ouvindo", async ({ browser }) => {
    const bia = await newParticipant(browser, "Bia Teste");
    await bia.page.goto(`/sala/${newRoomCode()}`);
    await bia.page.getByRole("switch").first().click();
    await expect(bia.page.getByRole("button", { name: /Entrar só ouvindo/ })).toBeVisible();
    await bia.context.close();
  });
});

test.describe("na sala", () => {
  test("sozinho: boas-vindas; sair e entrar de novo", async ({ browser }) => {
    const caio = await newParticipant(browser, "Caio Teste");
    const code = newRoomCode();
    await joinRoom(caio.page, code);
    await expect(caio.page.getByText("Você é a primeira pessoa aqui")).toBeVisible();

    await caio.page.getByRole("button", { name: "Sair da sala" }).click();
    await expect(caio.page.getByText("Você saiu da sala")).toBeVisible();
    await caio.page.getByRole("button", { name: "Entrar de novo" }).click();
    await expect(caio.page.getByLabel("Senha da sala (quem te convidou sabe)")).toBeVisible();
    await caio.context.close();
  });

  test("duas pessoas: aviso de entrada, chat, reação, mão e tela compartilhada", async ({
    browser,
  }) => {
    const code = newRoomCode();
    const dani = await newParticipant(browser, "Dani Souza");
    const edu = await newParticipant(browser, "Edu Lima");
    await fakeScreenCapture(dani.page);

    await joinRoom(dani.page, code);
    await dani.page.getByRole("button", { name: "Compartilhar minha tela" }).click();
    await expect(dani.page.getByLabel("Prévia da sua tela")).toBeVisible();

    await joinRoom(edu.page, code);
    await expect(dani.page.getByText("Edu Lima entrou na sala")).toBeVisible();
    await expect(
      edu.page.getByRole("region", { name: "Tela compartilhada por Dani Souza" }),
    ).toBeVisible();

    // Chat com o painel fechado: aviso e contador de não lidas.
    await edu.page.getByRole("button", { name: /^Chat/ }).click();
    await edu.page.getByPlaceholder("Escreva para a sala").fill("Oi, Dani!");
    await edu.page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(dani.page.getByRole("button", { name: "Chat (1 nova)" })).toBeVisible();

    // Reação.
    await edu.page.getByRole("button", { name: "Reações" }).click();
    await edu.page.getByRole("button", { name: "Reagir com 🎉" }).click();
    await expect(dani.page.getByText("🎉")).toBeVisible();

    // Mão levantada (gravada pelo servidor em /api/sala/mao).
    await edu.page.keyboard.press("Escape");
    await edu.page.keyboard.press("h");
    await expect(dani.page.getByText("✋ Edu Lima levantou a mão")).toBeVisible();

    await dani.context.close();
    await edu.context.close();
  });

  test("falha ao conectar oferece tentar de novo (B-01)", async ({ browser }) => {
    const fia = await newParticipant(browser, "Fia Teste");
    await fia.page.route("**/api/token", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { token: string };
      await route.fulfill({ response, json: { ...body, serverUrl: "ws://127.0.0.1:9" } });
    });
    await fia.page.goto(`/sala/${newRoomCode()}`);
    await fia.page.getByLabel("Senha da sala (quem te convidou sabe)").fill("senha-de-acesso-e2e");
    await fia.page.getByRole("button", { name: /Entrar na sala|Entrar só ouvindo/ }).click();
    await expect(fia.page.getByText("Não deu para conectar")).toBeVisible({ timeout: 30_000 });
    await expect(fia.page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    await fia.context.close();
  });
});
