import { isRouteErrorResponse } from "react-router";
import type * as Sentry from "@sentry/react-router";

let sdk: Promise<typeof Sentry | undefined> | undefined;
const pending: unknown[] = [];

/** O SDK só é baixado quando um DSN público foi configurado. */
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
        // Erros locais do navegador; erros do servidor já são registrados no entry.server.
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
      console.error("Não foi possível iniciar a observabilidade:", error);
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
