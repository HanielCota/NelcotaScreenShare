import { expect, test, vi } from "vitest";
import { BodyTooLargeError, readBodyText } from "@/server/body.server";

function postStream(body: ReadableStream<Uint8Array>) {
  const init: RequestInit & { duplex: "half" } = { method: "POST", body, duplex: "half" };
  return new Request("http://localhost/", init);
}

test("stops reading past the limit without closing the socket before the response", async () => {
  const cancel = vi.fn();
  const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => {
    controller.enqueue(new TextEncoder().encode("é"));
  });
  const stream = new ReadableStream<Uint8Array>({
    pull,
    cancel,
  });
  const request = postStream(stream);
  await expect(readBodyText(request, 3)).rejects.toBeInstanceOf(BodyTooLargeError);
  expect(cancel).not.toHaveBeenCalled();
  expect(pull.mock.calls.length).toBeLessThanOrEqual(3);
  await stream.cancel();
});

test("preserves the signed body when a character is split across chunks", async () => {
  const bytes = new TextEncoder().encode('{"nome":"João"}');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const request = postStream(stream);
  expect(await readBodyText(request, bytes.length)).toBe('{"nome":"João"}');
});
