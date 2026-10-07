import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { withRequest } from "./request-context.server";

type Handler = (request: Request) => Response | Promise<Response>;

/** `loader` of an API route: the handler runs in the request scope. */
export function apiLoader(handle: Handler) {
  return ({ request, context }: LoaderFunctionArgs) =>
    withRequest(request, context, () => handle(request));
}

/**
 * `action` of an API route that only accepts POST. The router hands every
 * non-GET/HEAD method here; the others get 405.
 */
export function apiAction(handle: Handler) {
  return ({ request, context }: ActionFunctionArgs) =>
    withRequest(request, context, () =>
      request.method === "POST"
        ? handle(request)
        : new Response(null, { status: 405, headers: { Allow: "POST" } }),
    );
}
