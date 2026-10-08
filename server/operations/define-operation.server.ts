import { z } from "zod";
import type { OperationResult } from "@/lib/operations/operation";
import type { AuditRecorder } from "@/server/audit.server";
import { requestLogger } from "@/server/request-log.server";
import { ActionError } from "./action-error";

/** What every operation declares; each access type adds its own (permission, 2FA...). */
export interface BasePolicy {
  name: string;
  audit: "required" | "none";
}

/**
 * Operation factory for one access type. `authorize` checks the caller and
 * builds the context; validation, the audit check and error handling live
 * here, the same for all of them.
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
        // Authorize before validating: invalid input does not bypass the session.
        const ctx = await authorize(policy);
        const parsed = schema.safeParse(input);
        if (!parsed.success) return { validationErrors: z.flattenError(parsed.error) };
        const data = await run({ parsedInput: parsed.data, ctx });
        if (policy.audit === "required" && ctx.audit.count === 0) {
          throw new Error(`Operation ${policy.name} did not record its audit entry.`);
        }
        return { data };
      } catch (error) {
        if (error instanceof ActionError) return { serverError: error.message };
        requestLogger({ operation: policy.name }).error({ err: error }, "operation failed");
        return { serverError: "Algo deu errado do nosso lado. Tente de novo em instantes." };
      }
    };
    return Object.assign((input: z.input<S>) => handle(input), { handle });
  };
}
