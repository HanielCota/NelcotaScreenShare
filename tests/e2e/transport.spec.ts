import { expect, test } from "@playwright/test";

test("production compresses HTML and JavaScript and varies by accepted encoding", async ({
  request,
}) => {
  const headers = { "Accept-Encoding": "gzip" };
  const page = await request.get("/", { headers });
  expect(page.headers()["content-encoding"]).toBe("gzip");
  expect(page.headers().vary).toContain("Accept-Encoding");
  const html = await page.text();
  expect(html).toContain("Compartilhe sua tela");
  const entry = html.match(/\/assets\/entry\.client-[\w-]+\.js/);
  expect(entry).not.toBeNull();
  if (!entry) throw new Error("The page did not advertise its entry module.");
  const script = await request.get(entry[0], { headers });
  expect(script.ok()).toBe(true);
  expect(script.headers()["content-encoding"]).toBe("gzip");
  expect(script.headers().vary).toContain("Accept-Encoding");
  expect((await script.body()).byteLength).toBeGreaterThan(1000);
});
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

test("behind an HTTPS proxy, browser actions reach the app instead of failing the CSRF check", async ({
  request,
}) => {
  // Production: TLS ends at the proxy, which forwards http with X-Forwarded-Proto. Before
  // trusting it, React Router saw an http request URL against an https Origin and answered
  // 400 to every `.data` action (account deletion showed the error page).
  const secureOrigin = E2E_URL.replace("http://", "https://");
  const response = await request.post("/api/operations/account-deleteMyAccount.data", {
    headers: { origin: secureOrigin, "x-forwarded-proto": "https" },
    data: { input: { password: "x" } },
  });
  // The app's own origin guard answers (APP_URL is http in the E2E): React Router let it through.
  expect(response.status()).toBe(403);
  expect(await response.text()).toContain("CROSS_SITE_REQUEST");
});
