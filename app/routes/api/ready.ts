import { apiLoader } from "@/server/api-route.server";
import { readiness } from "@/server/health.server";

export const loader = apiLoader(readiness);
