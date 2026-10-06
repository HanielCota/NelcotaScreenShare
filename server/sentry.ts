import "server-only";
import type { NodeOptions } from "@sentry/nextjs";

/**
 * Sentry no servidor, sem dados pessoais (LGPD): sem usuário, IP, cookies,
 * headers de autenticação, query string nem corpo de requisição. `traceLifecycle: "static"` mantém os
 * traces compatíveis com GlitchTip, se um dia trocarmos.
 */
export function sentryOptions(dsn: string): NodeOptions {
  return {
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    // SDK 11: o padrão coleta usuário, cookies, headers e corpos. Aqui, só o mínimo.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { allow: ["user-agent", "content-type", "x-request-id"] },
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0.1,
    traceLifecycle: "static",
    beforeSend(event) {
      if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          for (const name of ["cookie", "authorization", "x-forwarded-for", "x-real-ip"]) {
            delete event.request.headers[name];
          }
        }
      }
      return event;
    },
  };
}
