import { apiLoader } from "@/server/api-route.server";
import { liveness } from "@/server/health.server";

export const loader = apiLoader(liveness);
