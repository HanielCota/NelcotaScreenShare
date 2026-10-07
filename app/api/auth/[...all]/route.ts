import { forbiddenCrossSite, isCrossSiteMutation } from "@/features/auth/server/origin-guard";
import { getUserAuth } from "@/features/auth/server/participant-auth";

/** Better Auth das contas de participantes (cadastro, login, verificação, 2FA). */
async function handle(request: Request): Promise<Response> {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  return getUserAuth().handler(request);
}

export { handle as GET, handle as POST };
