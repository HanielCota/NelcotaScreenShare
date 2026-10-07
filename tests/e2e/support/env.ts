/** E2E constants shared between the Playwright config and the tests. */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
if (!Number.isInteger(E2E_PORT) || E2E_PORT < 1 || E2E_PORT > 65535) {
  throw new Error("E2E_PORT must be an integer port between 1 and 65535.");
}
// Explicit address: another process may serve localhost over IPv6 on the same port.
export const E2E_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_ACCESS_PASSWORD = "senha-de-acesso-e2e";
