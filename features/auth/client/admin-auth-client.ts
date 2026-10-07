import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for the admin panel (its own instance at
 * /api/admin/auth; never mixes with the participant account).
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
