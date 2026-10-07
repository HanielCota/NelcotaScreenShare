/** Constantes do E2E compartilhadas entre a config do Playwright e os testes. */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
if (!Number.isInteger(E2E_PORT) || E2E_PORT < 1 || E2E_PORT > 65535) {
  throw new Error("E2E_PORT precisa ser uma porta inteira entre 1 e 65535.");
}
// Endereço explícito: outro processo pode atender localhost em IPv6 na mesma porta.
export const E2E_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_ACCESS_PASSWORD = "senha-de-acesso-e2e";
