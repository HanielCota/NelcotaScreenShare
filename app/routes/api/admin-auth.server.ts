import { getAdminAuth } from "@/features/auth/server/admin-auth.server";
import {
  forbiddenCrossSite,
  isCrossSiteMutation,
} from "@/features/auth/server/origin-guard.server";

/** Better Auth da instância de admin (login, 2FA, sessões, redefinição de senha). */
async function handle(request: Request): Promise<Response> {
  const auth = getAdminAuth();
  if (!auth) {
    return Response.json(
      { code: "ADMIN_DISABLED", message: "O painel admin está desligado neste servidor." },
      { status: 503 },
    );
  }
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  return auth.handler(request);
}

export { handle as GET, handle as POST };
