import { z } from "zod";
import type { OperationResult } from "@/lib/operations/operation";
import type { AuditRecorder } from "@/server/audit.server";
import { requestLogger } from "@/server/request-log.server";
import { ActionError } from "./action-error";

/** O que toda operação declara; cada tipo de acesso acrescenta o seu (permissão, 2FA...). */
export interface BasePolicy {
  name: string;
  audit: "required" | "none";
}

/**
 * Fábrica de operações para um tipo de acesso. `authorize` confere quem chama e
 * monta o contexto; aqui ficam a validação, a checagem da auditoria e o
 * tratamento de erros, iguais para todas.
 */
export function defineOperation<P extends BasePolicy, C extends { audit: AuditRecorder }>(
  authorize: (policy: P) => Promise<C>,
) {
  return <S extends z.ZodType, O>(
    policy: P,
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
