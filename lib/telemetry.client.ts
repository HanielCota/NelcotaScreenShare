import { isRouteErrorResponse } from "react-router";
import type * as Sentry from "@sentry/react-router";

let sdk: Promise<typeof Sentry | undefined> | undefined;
const pending: unknown[] = [];

/** The SDK is only downloaded when a public DSN is configured. */
export function configureBrowserTelemetry(config?: { dsn?: string; release?: string }) {
  if (!config?.dsn || sdk) return;
  const { dsn, release } = config;
  sdk = import("@sentry/react-router")
    .then((sentry) => {
      sentry.init({
        dsn,
        release,
        environment: import.meta.env.MODE,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        // Local browser errors; server errors are already recorded in entry.server.
        beforeSend(event) {
          event.user = undefined;
          if (event.request) {
            event.request.cookies = undefined;
            event.request.data = undefined;
            event.request.headers = undefined;
            if (event.request.url) event.request.url = event.request.url.split("?")[0];
          }
          return event;
        },
      });
      for (const error of pending.splice(0)) sentry.captureException(error);
      return sentry;
    })
    .catch((error: unknown) => {
      console.error("Could not start observability:", error);
      return undefined;
    });
}

export function reportBrowserError(error: unknown) {
  if (isRouteErrorResponse(error)) return;
  console.error(error);
  if (sdk)
    void sdk.then((sentry) => {
      sentry?.captureException(error);
    });
  else if (pending.length < 10) pending.push(error);
}
