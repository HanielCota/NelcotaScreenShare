import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/auth/origin-guard";
import { getUserAuth } from "@/server/auth/user";

/** Better Auth das contas de participantes (cadastro, login, verificação, 2FA). */
async function handle(request: Request): Promise<Response> {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  return getUserAuth().handler(request);
}

export { handle as GET, handle as POST };
