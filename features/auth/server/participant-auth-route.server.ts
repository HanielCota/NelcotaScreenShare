import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";
import { boundAuthBody } from "./auth-body.server";
import { handleAuthWithMailDelivery } from "./auth-mail.server";

/** Better Auth for participant accounts (sign-up, sign-in, verification, 2FA). */
export async function handleParticipantAuth(request: Request): Promise<Response> {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  const bounded = await boundAuthBody(request);
  if (bounded instanceof Response) return bounded;
  return handleAuthWithMailDelivery(bounded, getUserAuth());
}
