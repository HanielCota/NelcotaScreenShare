import { apiAction, apiLoader } from "@/server/api-route.server";
import { handleAdminAuth } from "@/features/auth/server/admin-auth-route.server";

export const loader = apiLoader(handleAdminAuth);
export const action = apiAction(handleAdminAuth);
