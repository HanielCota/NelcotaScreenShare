import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { withRequest } from "./request-context.server";

type Handler = (request: Request) => Response | Promise<Response>;

/** `loader` de uma rota de API: o handler roda no escopo da requisição. */
export function apiLoader(handle: Handler) {
  return ({ request, context }: LoaderFunctionArgs) =>
    withRequest(request, context, () => handle(request));
}

/**
 * `action` de uma rota de API que só aceita POST. O roteador entrega aqui todo
 * método que não é GET/HEAD; os outros recebem 405.
 */
export function apiAction(handle: Handler) {
  return ({ request, context }: ActionFunctionArgs) =>
    withRequest(request, context, () =>
      request.method === "POST"
        ? handle(request)
        : new Response(null, { status: 405, headers: { Allow: "POST" } }),
    );
}
