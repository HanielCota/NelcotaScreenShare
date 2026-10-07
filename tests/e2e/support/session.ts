import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { E2E_ACCESS_PASSWORD, E2E_URL } from "./env";

export const PASSWORD = "senha-do-participante-e2e";

let sequence = 0;

/**
 * Cada pessoa do teste vem de um "IP" próprio (X-Forwarded-For, lido pelo
 * middleware do servidor como em produção atrás do Traefik): o cadastro tem limite por IP.
 */
export async function newVisitor(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  sequence += 1;
  const ip = `10.77.${Math.floor(sequence / 250)}.${(sequence % 250) + 1}`;
  const context = await browser.newContext({
    baseURL: E2E_URL,
    locale: "pt-BR",
    permissions: ["microphone"],
    extraHTTPHeaders: { "x-forwarded-for": ip },
  });
  return { context, page: await context.newPage() };
}

export interface Participant {
  context: BrowserContext;
  page: Page;
  name: string;
  email: string;
}

/** Conta nova já logada (cadastro pela API; a confirmação de e-mail está desligada no E2E). */
export async function newParticipant(browser: Browser, name: string): Promise<Participant> {
  const { context, page } = await newVisitor(browser);
  const email = `${name.toLowerCase().replaceAll(/\s+/g, ".")}.${Date.now()}.${sequence}@exemplo.dev`;
  const response = await context.request.post("/api/auth/sign-up/email", {
    data: { name, email, password: PASSWORD },
    headers: { origin: E2E_URL },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return { context, page, name, email };
}

let roomSequence = 0;

/** Código de sala novo e válido para cada teste. */
export function newRoomCode(): string {
  roomSequence += 1;
  const tail = `${Date.now().toString(36).slice(-4)}${roomSequence}`.padEnd(4, "x").slice(0, 4);
  return `e2e-${tail}-sala`;
}

/** Abre a sala, passa pela pré-entrada (senha da sala) e espera a sala carregar. */
export async function joinRoom(page: Page, code: string, { micOn = true } = {}) {
  await page.goto(`/sala/${code}`);
  await expect(page.getByLabel("Senha da sala (quem te convidou sabe)")).toBeVisible();
  if (!micOn) await page.getByRole("switch").first().click();
  await page.getByLabel("Senha da sala (quem te convidou sabe)").fill(E2E_ACCESS_PASSWORD);
  await page.getByRole("button", { name: /Entrar na sala|Entrar só ouvindo/ }).click();
  await expect(page.getByRole("button", { name: /Sair/ })).toBeVisible();
}
