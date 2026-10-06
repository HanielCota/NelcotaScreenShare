import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Cliente do Better Auth para o painel admin (instância própria em
 * /api/admin/auth; nunca se mistura com a conta de participante).
 */
export const adminAuthClient = createAuthClient({
  basePath: "/api/admin/auth",
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.assign("/admin/verificar-2fa");
      },
    }),
  ],
});
