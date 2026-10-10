import { AsyncLocalStorage } from "node:async_hooks";
import { createContext, type RouterContextProvider } from "react-router";

interface RequestScope {
  request: Request;
  memo: Map<object, unknown>;
}

const scope = new AsyncLocalStorage<RequestScope>();
const memoContext = createContext<Map<object, unknown>>();

/** Shares only data from the same request between parallel loaders. */
export function withRequest<T>(
  request: Request,
  context: Readonly<RouterContextProvider>,
  run: () => T,
): T {
  return scope.run({ request, memo: memoFor(context) }, run);
}

/** The request's memo, created on first use (`context.get` throws while it is unset). */
function memoFor(context: Readonly<RouterContextProvider>): Map<object, unknown> {
  try {
    return context.get(memoContext);
  } catch {
    const memo = new Map<object, unknown>();
    context.set(memoContext, memo);
    return memo;
  }
}

export function requestHeaders(): Headers {
  const current = scope.getStore();
  if (!current) throw new Error("This operation requires an HTTP request.");
  return current.request.headers;
}

export function requestMemo<T>(load: () => Promise<T>): () => Promise<T> {
  const values = new WeakMap<Map<object, unknown>, Promise<T>>();
  return () => {
    const current = scope.getStore();
    if (!current) return load();
    const cached = values.get(current.memo);
    if (cached) return cached;
    const result = load();
    values.set(current.memo, result);
    return result;
  };
}

export function readCookie(headers: Headers, name: string): string | undefined {
  const part = headers
    .get("cookie")
    ?.split(";")
    .find((item) => item.trim().startsWith(`${name}=`));
  return part?.trim().slice(name.length + 1);
}
