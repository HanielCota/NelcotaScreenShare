import { logBrowserWarning } from "@/lib/telemetry.client";

/** Response body as JSON, or `null` when it is not JSON (e.g. a proxy's HTML error page). */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    logBrowserWarning("Response body is not JSON", error);
    return null;
  }
}
