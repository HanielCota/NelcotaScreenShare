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

/** Checks the envelope; `data` is trusted to be the operation's declared output. */
function resultSchema<O>() {
  return z.object({
    data: z.custom<O>().optional(),
    serverError: z.string().optional(),
    validationErrors: z.record(z.string(), z.unknown()).optional(),
  });
}

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
    const result: OperationResult<O> = resultSchema<O>().parse(await response.json());
    if (result.data !== undefined && method === "post")
      window.dispatchEvent(new Event("nelcota:mutation"));
    return result;
  };
  return Object.assign(execute, { url, method });
}
