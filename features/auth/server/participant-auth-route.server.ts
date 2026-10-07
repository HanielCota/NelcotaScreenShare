import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";

/** Better Auth for participant accounts (sign-up, sign-in, verification, 2FA). */
export async function handleParticipantAuth(request: Request): Promise<Response> {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  return getUserAuth().handler(request);
}
