import { getAdminAuth } from "@/features/auth/server/admin-auth.server";
import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";

/** Better Auth of the admin instance (sign-in, 2FA, sessions, password reset). */
export async function handleAdminAuth(request: Request): Promise<Response> {
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
