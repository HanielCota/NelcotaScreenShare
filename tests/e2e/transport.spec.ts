import { expect, test } from "@playwright/test";
import { E2E_URL } from "./support/env";

test("an oversized body gets 413 without destroying the connection before the response", async ({
  request,
}) => {
  // Reuse the connection repeatedly: closing during an in-flight upload caused intermittent resets.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request.post("/api/operations/auth-acceptInvitation", {
      headers: { origin: E2E_URL },
      data: { input: "x".repeat(1024 * 1024 + 1) },
    });
    expect(response.status()).toBe(413);
    expect(response.headers().connection).not.toBe("close");
    expect((await request.get("/api/health")).status()).toBe(200);
  }
});

test("webhook limits UTF-8 bytes in a chunked request without Content-Length", async () => {
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
