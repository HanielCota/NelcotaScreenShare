import { apiLoader } from "@/server/api-route.server";
import { sitemapXml } from "@/server/seo.server";

export const loader = apiLoader(sitemapXml);
