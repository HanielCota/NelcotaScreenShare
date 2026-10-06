import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Cliente do Better Auth das contas de participantes (/api/auth). */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        const back = new URLSearchParams(window.location.search).get("voltar");
        window.location.assign(`/entrar/2fa${back ? `?voltar=${encodeURIComponent(back)}` : ""}`);
      },
    }),
  ],
});
