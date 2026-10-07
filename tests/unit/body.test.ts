import { expect, test, vi } from "vitest";
import { BodyTooLargeError, readBodyText } from "@/server/body.server";

function postStream(body: ReadableStream<Uint8Array>) {
  const init: RequestInit & { duplex: "half" } = { method: "POST", body, duplex: "half" };
  return new Request("http://localhost/", init);
}

test("rejects promptly and drains the rest without cancelling the upload", async () => {
  const cancel = vi.fn();
  let source: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      source = controller;
      controller.enqueue(new TextEncoder().encode("éé"));
    },
    cancel,
  });
  const request = postStream(stream);
  await expect(readBodyText(request, 3)).rejects.toBeInstanceOf(BodyTooLargeError);
  expect(cancel).not.toHaveBeenCalled();
  expect(stream.locked).toBe(true);
  source?.enqueue(new Uint8Array(100));
  source?.close();
  await vi.waitFor(() => expect(stream.locked).toBe(false));
  expect(cancel).not.toHaveBeenCalled();
});

test("a declared oversized upload is drained even before any bytes arrive", async () => {
  let source: ReadableStreamDefaultController<Uint8Array> | undefined;
  const request = postStream(
    new ReadableStream<Uint8Array>({
      start(controller) {
        source = controller;
      },
    }),
  );
  request.headers.set("content-length", "100");
  await expect(readBodyText(request, 3)).rejects.toBeInstanceOf(BodyTooLargeError);
  source?.enqueue(new Uint8Array(100));
  source?.close();
  await vi.waitFor(() => expect(request.body?.locked).toBe(false));
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
