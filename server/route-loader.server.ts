import type { LoaderFunctionArgs } from "react-router";
import { withRequest } from "./request-context.server";

type RouteRequest = LoaderFunctionArgs & { searchParams: Record<string, string> };

/** Escopo e URL comuns; cada rota continua declarando sua consulta e autorização. */
export function routeLoader<T>(load: (args: RouteRequest) => T) {
  return (args: LoaderFunctionArgs): T =>
    withRequest(args.request, args.context, () =>
      load({
        ...args,
        searchParams: Object.fromEntries(new URL(args.request.url).searchParams),
      }),
    );
}
