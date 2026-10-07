import { z } from "zod";

export interface OperationResult<T> {
  data?: T;
  serverError?: string;
  validationErrors?: Record<string, unknown>;
}

export type Operation<I, O> = ((input: I) => Promise<OperationResult<O>>) & {
  url: string;
  method: "get" | "post";
};

/** Public descriptor: only URL and types; no server code or secrets. */
export function operation<I, O>(id: string, method: "get" | "post" = "post"): Operation<I, O> {
  const url = `/api/operations/${id}`;
  const execute = async (input: I): Promise<OperationResult<O>> => {
    const body = JSON.stringify({ input });
    const response = await fetch(
      method === "get" ? `${url}?payload=${encodeURIComponent(body)}` : url,
      {
        method: method.toUpperCase(),
        headers: method === "post" ? { "Content-Type": "application/json" } : {},
        ...(method === "post" ? { body } : {}),
      },
    );
    const result = z
      .custom<OperationResult<O>>((value) => value !== null && typeof value === "object")
      .parse(await response.json());
    if (result.data !== undefined && method === "post")
      window.dispatchEvent(new Event("nelcota:mutation"));
    return result;
  };
  return Object.assign(execute, { url, method });
}
