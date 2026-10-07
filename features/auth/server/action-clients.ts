import "server-only";
import { headers } from "next/headers";
import { createSafeActionClient } from "next-safe-action";
import { ActionError } from "@/server/actions/errors";
import { z } from "zod";
import { createAuditRecorder, type AuditRecorder } from "@/server/audit/record";
import { getAdminSession, needsTwoFactorSetup } from "./admin-session";
import { can, type PermissionRequest } from "./permissions";
import { FRESH_SESSION_SECONDS } from "./auth-shared";
import { getUserSession } from "./participant-session";
import { clientIpFrom } from "@/server/client-ip";
import { requestLogger } from "@/server/request-log";
import { createRateLimiter, type RateLimiter } from "@/server/rate-limit";

/** Janela de sessão "fresca" para ações críticas (a mesma do freshAge do Better Auth). */
const FRESH_SESSION_MS = FRESH_SESSION_SECONDS * 1000;

const metadataSchema = z.object({
  /** Nome estável da action (logs e auditoria), ex.: "account.revokeSession". */
  name: z.string().regex(/^[a-zA-Z]+\.[a-zA-Z]+$/),
  permission: z.custom<PermissionRequest>().optional(),
  /** Ação crítica: exige login nos últimos 10 minutos. */
  fresh: z.boolean().optional(),
  /** Permite usar sem 2FA ativo (só as telas de configurar o 2FA). */
  allowWithoutTwoFactor: z.boolean().optional(),
  /**
   * Obrigatório: toda action declara se é auditada. "required" = tem de gravar
   * exatamente o que fez em audit_logs (na mesma transação), senão falha.
   */
  audit: z.enum(["required", "none"]),
});

export type ActionMetadata = z.infer<typeof metadataSchema>;

/**
 * Cliente base. Erro inesperado nunca vaza para o navegador: vira uma
 * mensagem genérica e vai para o log com o request_id.
 */
const actionClient = createSafeActionClient({
  defineMetadataSchema: () => metadataSchema,
  async handleServerError(error, { metadata }) {
    if (error instanceof ActionError) return error.message;
    (await requestLogger({ action: metadata?.name })).error(
      { err: error },
      "falha numa server action",
    );
    return "Algo deu errado do nosso lado. Tente de novo em instantes.";
  },
});

/** Action auditada que terminou sem registrar: bug, nunca silencioso. */
function assertAudited(metadata: ActionMetadata, audit: AuditRecorder, success: boolean) {
  if (metadata.audit === "required" && success && audit.count === 0) {
    throw new Error(`A action ${metadata.name} é auditada mas não gravou em audit_logs`);
  }
}

/**
 * Toda mutação do painel passa por aqui: sessão válida, 2FA (quando o papel
 * exige), permissão e sessão fresca são conferidos DENTRO da action, nunca só
 * na página ou no proxy (docs/PLANO-ADMIN.md §5.3).
 */
export const adminAction = actionClient.use(async ({ next, metadata }) => {
  const admin = await getAdminSession();
  if (!admin) throw new ActionError("Sua sessão expirou. Entre de novo.");
  if (!metadata.allowWithoutTwoFactor && needsTwoFactorSetup(admin)) {
    throw new ActionError("Ative a verificação em duas etapas para continuar.");
  }
  if (metadata.permission && !can(admin.user.role, metadata.permission)) {
    throw new ActionError("Você não tem permissão para fazer isso.");
  }
  if (metadata.fresh && Date.now() - admin.session.createdAt.getTime() > FRESH_SESSION_MS) {
    throw new ActionError("Por segurança, entre de novo para fazer isso.");
  }
  const audit = createAuditRecorder({ adminId: admin.user.id });
  const result = await next({ ctx: { admin, audit } });
  assertAudited(metadata, audit, result.success);
  return result;
});

const publicLimiters = new Map<string, RateLimiter>();

/**
 * Actions sem sessão (aceitar convite, cadastro…): rate limit por IP e por
 * action, 10 chamadas a cada 15 minutos.
 */
export const publicAction = actionClient.use(async ({ next, metadata }) => {
  let limiter = publicLimiters.get(metadata.name);
  if (!limiter) {
    limiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });
    publicLimiters.set(metadata.name, limiter);
  }
  const ip = clientIpFrom(await headers()) ?? "desconhecido";
  if (!limiter.hit(ip).ok) throw new ActionError("Muitas tentativas. Aguarde alguns minutos.");
  const audit = createAuditRecorder("system");
  const result = await next({ ctx: { audit } });
  assertAudited(metadata, audit, result.success);
  return result;
});

/**
 * Actions do participante logado (Minha conta). `fresh` exige login nos
 * últimos 10 minutos. Excluir a conta pede a senha atual, com limite de erros.
 */
export const userAction = actionClient.use(async ({ next, metadata }) => {
  const current = await getUserSession();
  if (!current) throw new ActionError("Sua sessão expirou. Entre de novo.");
  if (metadata.fresh && Date.now() - current.session.createdAt.getTime() > FRESH_SESSION_MS) {
    throw new ActionError("Por segurança, entre de novo para fazer isso.");
  }
  const audit = createAuditRecorder({ userId: current.user.id });
  const result = await next({ ctx: { current, audit } });
  assertAudited(metadata, audit, result.success);
  return result;
});
