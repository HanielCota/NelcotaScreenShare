import { expect, test } from "@playwright/test";
import { E2E_URL } from "./support/env";

test("corpo excessivo recebe 413 sem destruir a conexão antes da resposta", async ({ request }) => {
  const response = await request.post("/api/operations/auth-acceptInvitation", {
    headers: { origin: E2E_URL },
    data: { input: "x".repeat(1024 * 1024 + 1) },
  });
  expect(response.status()).toBe(413);
});

test("webhook limita bytes UTF-8 em uma requisição chunked sem Content-Length", async () => {
  const body = new TextEncoder().encode(JSON.stringify({ padding: "é".repeat(33 * 1024) }));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    },
  });
  const init: RequestInit & { duplex: "half" } = { method: "POST", body: stream, duplex: "half" };
  const response = await fetch(`${E2E_URL}/api/livekit/webhook`, init);
  expect(response.status).toBe(413);
  expect(await response.json()).toEqual({ error: "payload_too_large" });
});
