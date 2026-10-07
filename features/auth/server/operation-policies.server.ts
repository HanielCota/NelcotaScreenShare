import { ActionError } from "@/server/operations/action-error";
import { defineOperation, type BasePolicy } from "@/server/operations/define-operation.server";
import { createAuditRecorder, type AuditRecorder } from "@/server/audit.server";
import { requestHeaders } from "@/server/request-context.server";
import { clientIpFrom } from "@/server/client-ip.server";
import { createRateLimiter, type RateLimiter } from "@/server/rate-limit.server";
import { getAdminSession, needsTwoFactorSetup } from "./admin-session.server";
import { getUserSession } from "./participant-session.server";
import { can, type PermissionRequest } from "./permissions.server";
import { FRESH_SESSION_SECONDS } from "./auth-shared.server";

/** Quem pode chamar: sessão de admin ou de participante, ou acesso público com limite. */
interface Policy extends BasePolicy {
  permission?: PermissionRequest;
  fresh?: boolean;
  allowWithoutTwoFactor?: boolean;
}
type AdminContext = {
  admin: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;
  audit: AuditRecorder;
};
type UserContext = {
  current: NonNullable<Awaited<ReturnType<typeof getUserSession>>>;
  audit: AuditRecorder;
};
const publicLimiters = new Map<string, RateLimiter>();

function checkFresh(createdAt: Date, policy: Policy) {
  if (policy.fresh && Date.now() - createdAt.getTime() > FRESH_SESSION_SECONDS * 1000) {
    throw new ActionError("Por segurança, entre de novo para fazer isso.");
  }
}

export const defineAdminOperation = defineOperation<Policy, AdminContext>(async (policy) => {
  const admin = await getAdminSession();
  if (!admin) throw new ActionError("Sua sessão expirou. Entre de novo.");
  if (!policy.allowWithoutTwoFactor && needsTwoFactorSetup(admin))
    throw new ActionError("Ative a verificação em duas etapas para continuar.");
  if (policy.permission && !can(admin.user.role, policy.permission))
    throw new ActionError("Você não tem permissão para fazer isso.");
  checkFresh(admin.session.createdAt, policy);
  return { admin, audit: createAuditRecorder({ adminId: admin.user.id }) };
});

export const defineUserOperation = defineOperation<Policy, UserContext>(async (policy) => {
  const current = await getUserSession();
  if (!current) throw new ActionError("Sua sessão expirou. Entre de novo.");
  checkFresh(current.session.createdAt, policy);
  return { current, audit: createAuditRecorder({ userId: current.user.id }) };
});

export const definePublicOperation = defineOperation(async (policy: Policy) => {
  let limiter = publicLimiters.get(policy.name);
  if (!limiter) {
    limiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
    publicLimiters.set(policy.name, limiter);
  }
  if (!limiter.hit(clientIpFrom(requestHeaders()) ?? "desconhecido").ok)
    throw new ActionError("Muitas tentativas. Aguarde alguns minutos.");
  return { audit: createAuditRecorder("system") };
});
