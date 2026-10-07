import { RouterContextProvider } from "react-router";
import { expect, test, vi } from "vitest";
import { withRequest, requestHeaders, requestMemo } from "@/server/request-context.server";

function request(user: string) {
  return new Request("http://localhost/", { headers: { "x-user": user } });
}

test("parallel loaders of the same request share only their own session", async () => {
  const load = vi.fn(async () => {
    await Promise.resolve();
    return requestHeaders().get("x-user");
  });
  const session = requestMemo(load);
  const context = new RouterContextProvider();
  const results = await Promise.all([
    withRequest(request("Ana"), context, session),
    withRequest(request("Ana"), context, session),
    withRequest(request("Bia"), new RouterContextProvider(), session),
  ]);
  expect(results).toEqual(["Ana", "Ana", "Bia"]);
  expect(load).toHaveBeenCalledTimes(2);
  expect(() => requestHeaders()).toThrow("HTTP request");
});

test("a new request does not reuse the previous request session", async () => {
  const session = requestMemo(async () => requestHeaders().get("x-user"));
  expect(await withRequest(request("Ana"), new RouterContextProvider(), session)).toBe("Ana");
  expect(await withRequest(request("Bia"), new RouterContextProvider(), session)).toBe("Bia");
});
