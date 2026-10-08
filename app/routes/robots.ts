import { apiLoader } from "@/server/api-route.server";
import { robotsTxt } from "@/server/seo.server";

export const loader = apiLoader(robotsTxt);
