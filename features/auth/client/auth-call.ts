import type { AuthErrorLike } from "@/features/auth/domain/auth-errors";
import { reportBrowserError } from "@/lib/telemetry.client";

/** An error with no code: forms show their fallback message. */
const UNREACHABLE_FAILURE: { data: null; error: AuthErrorLike } = {
  data: null,
  error: { status: 0 },
};

/**
 * Better Auth answers HTTP failures with `{ error }`, but a network failure (or a
 * client bug) still throws. This reports the throw and turns it into the same
 * `{ error }` shape, so a form never stays stuck "sending".
 */
export async function callAuth<Result>(
  call: () => Promise<Result>,
): Promise<Result | { data: null; error: AuthErrorLike }> {
  try {
    return await call();
  } catch (error) {
    reportBrowserError(error);
    return UNREACHABLE_FAILURE;
  }
}
