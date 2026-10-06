/**
 * Sentry no navegador, carregado só quando há DSN (sem DSN, nenhum byte do SDK
 * vai para o bundle das páginas). Mesmas regras de privacidade do servidor.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      tracesSampleRate: 0.1,
      traceLifecycle: "static",
    });
  });
}
