import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { withRequest } from "@/server/request-context.server";
import { BodyTooLargeError, readBodyText } from "@/server/body.server";
import { operations, readOperations } from "@/features/auth/server/operation-registry.server";
import {
  forbiddenCrossSite,
  isCrossSiteMutation,
} from "@/features/auth/server/origin-guard.server";

const successRedirects: Record<string, string> = {
  "auth-acceptInvitation": "/admin/entrar?aviso=convite",
  "account-deleteMyAccount": "/?aviso=conta-excluida",
};

async function readInput(request: Request): Promise<unknown> {
  const payload: unknown =
    request.method === "GET"
      ? JSON.parse(new URL(request.url).searchParams.get("payload") ?? "{}")
      : JSON.parse(await readBodyText(request, 1024 * 1024));
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("invalid input");
  return "input" in payload ? payload.input : undefined;
}

async function dispatch({ request, params, context }: LoaderFunctionArgs | ActionFunctionArgs) {
  const id = params.operation ?? "";
  if (!Object.hasOwn(operations, id))
    return Response.json({ serverError: "Operação não encontrada." }, { status: 404 });
  const expectedMethod = readOperations.has(id) ? "GET" : "POST";
  if (request.method !== expectedMethod)
    return new Response(null, { status: 405, headers: { Allow: expectedMethod } });
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  let input: unknown;
  try {
    input = await readInput(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      return Response.json(
        { serverError: "Solicitação grande demais." },
        {
          status: 413,
          headers: { Connection: "close", "Cache-Control": "no-store" },
        },
      );
    return Response.json({ serverError: "Solicitação inválida." }, { status: 400 });
  }
  const operation = operations[id]!;
  const result = await withRequest(request, context, () => operation.handle(input));
  const destination = successRedirects[id];
  if (result.data !== undefined && destination)
    return redirect(destination, { status: 303, headers: { "Cache-Control": "no-store" } });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export const loader = dispatch;
export const action = dispatch;
