import { expect, test } from "vitest";
import { AUTH_MAX_BODY_BYTES, boundAuthBody } from "@/features/auth/server/auth-body.server";

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

test("hands over an equivalent request when the body fits", async () => {
  const body = JSON.stringify({ email: "ana@exemplo.dev", image: "x".repeat(180_000) });
  const bounded = await boundAuthBody(post(body, { cookie: "nelcota.session=1" }));
  if (bounded instanceof Response) throw new Error("expected a request");
  expect(bounded.method).toBe("POST");
  expect(bounded.url).toBe("http://localhost/api/auth/sign-up/email");
  expect(bounded.headers.get("cookie")).toBe("nelcota.session=1");
  expect(await bounded.json()).toEqual(JSON.parse(body));
});

test("answers 413 to an oversized body, declared or not", async () => {
  const oversized = "x".repeat(AUTH_MAX_BODY_BYTES + 1);
  const streamed = await boundAuthBody(post(oversized));
  expect(streamed).toBeInstanceOf(Response);
  expect((streamed as Response).status).toBe(413);
  const declared = await boundAuthBody(post("{}", { "content-length": "999999999" }));
  expect((declared as Response).status).toBe(413);
});

test("answers 400 to a body that is not UTF-8", async () => {
  const bounded = await boundAuthBody(post(new Uint8Array([0xff, 0xfe, 0xfd])));
  expect((bounded as Response).status).toBe(400);
});

test("leaves requests without a body untouched", async () => {
  const request = new Request("http://localhost/api/auth/get-session");
  expect(await boundAuthBody(request)).toBe(request);
});
