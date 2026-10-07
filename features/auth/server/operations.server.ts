import { z } from "zod";
import { ActionError } from "@/server/actions/errors";
import { createAuditRecorder, type AuditRecorder } from "@/server/audit/record.server";
import { requestHeaders } from "@/server/request-context.server";
import { requestLogger } from "@/server/request-log.server";
import { clientIpFrom } from "@/server/client-ip";
import { createRateLimiter, type RateLimiter } from "@/server/rate-limit.server";
import type { OperationResult } from "@/lib/operation";
import { getAdminSession, needsTwoFactorSetup } from "./admin-session.server";
import { getUserSession } from "./participant-session.server";
import { can, type PermissionRequest } from "./permissions.server";
import { FRESH_SESSION_SECONDS } from "./auth-shared.server";

interface Policy {
  name: string;
  permission?: PermissionRequest;
  fresh?: boolean;
  allowWithoutTwoFactor?: boolean;
  audit: "required" | "none";
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

function defineOperation<C extends { audit: AuditRecorder }>(
  authorize: (policy: Policy) => Promise<C>,
) {
  return <S extends z.ZodType, O>(
    policy: Policy,
    schema: S,
    run: (args: { parsedInput: z.output<S>; ctx: C }) => Promise<O>,
  ) => {
    const handle = async (input: unknown): Promise<OperationResult<O>> => {
      try {
        // Autoriza antes de validar: uma entrada inválida não contorna a sessão.
        const ctx = await authorize(policy);
        const parsed = schema.safeParse(input);
        if (!parsed.success) return { validationErrors: z.flattenError(parsed.error) };
        const data = await run({ parsedInput: parsed.data, ctx });
        if (policy.audit === "required" && ctx.audit.count === 0) {
          throw new Error(`A operação ${policy.name} não registrou sua auditoria.`);
        }
        return { data };
      } catch (error) {
        if (error instanceof ActionError) return { serverError: error.message };
        (await requestLogger({ operation: policy.name })).error(
          { err: error },
          "falha numa operação",
        );
        return { serverError: "Algo deu errado do nosso lado. Tente de novo em instantes." };
      }
    };
    return Object.assign((input: z.input<S>) => handle(input), { handle });
  };
}

export const defineAdminOperation = defineOperation<AdminContext>(async (policy) => {
  const admin = await getAdminSession();
  if (!admin) throw new ActionError("Sua sessão expirou. Entre de novo.");
  if (!policy.allowWithoutTwoFactor && needsTwoFactorSetup(admin))
    throw new ActionError("Ative a verificação em duas etapas para continuar.");
  if (policy.permission && !can(admin.user.role, policy.permission))
    throw new ActionError("Você não tem permissão para fazer isso.");
  checkFresh(admin.session.createdAt, policy);
  return { admin, audit: createAuditRecorder({ adminId: admin.user.id }) };
});

export const defineUserOperation = defineOperation<UserContext>(async (policy) => {
  const current = await getUserSession();
  if (!current) throw new ActionError("Sua sessão expirou. Entre de novo.");
  checkFresh(current.session.createdAt, policy);
  return { current, audit: createAuditRecorder({ userId: current.user.id }) };
});

export const definePublicOperation = defineOperation(async (policy) => {
  let limiter = publicLimiters.get(policy.name);
  if (!limiter) {
    limiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
    publicLimiters.set(policy.name, limiter);
  }
  if (!limiter.hit(clientIpFrom(requestHeaders()) ?? "desconhecido").ok)
    throw new ActionError("Muitas tentativas. Aguarde alguns minutos.");
  return { audit: createAuditRecorder("system") };
});
