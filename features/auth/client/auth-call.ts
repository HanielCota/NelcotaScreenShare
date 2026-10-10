import type { AuthErrorLike } from "@/features/auth/domain/auth-errors";
import { reportUnlessNetworkFailure } from "@/lib/telemetry.client";

/** An error with no code: forms show their fallback message. */
const UNREACHABLE_FAILURE: { data: null; error: AuthErrorLike } = {
  data: null,
  error: { status: 0 },
};

/**
 * Better Auth answers HTTP failures with `{ error }`, but a network failure (or a
 * client bug) still throws. This turns the throw into the same `{ error }` shape, so a
 * form never stays stuck "sending"; only a client bug reaches telemetry.
 */
export async function callAuth<Result>(
  call: () => Promise<Result>,
): Promise<Result | { data: null; error: AuthErrorLike }> {
  try {
    return await call();
  } catch (error) {
    reportUnlessNetworkFailure("Auth request failed:", error);
    return UNREACHABLE_FAILURE;
  }
}
