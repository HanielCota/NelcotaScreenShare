import { redirect as redirectResponse } from "react-router";

export function redirect(location: string): never {
  throw redirectResponse(location);
}

export function notFound(): never {
  throw new Response("Página não encontrada", { status: 404 });
}
