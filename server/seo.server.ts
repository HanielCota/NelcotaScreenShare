import { PUBLIC_PATHS } from "@/lib/seo";
import { getEnv } from "@/server/env.server";

/** Public origin for absolute links: APP_URL in production, the request's origin in dev. */
export function publicOrigin(request: Request): string {
  const configured = getEnv().APP_URL;
  return new URL(configured ?? request.url).origin;
}

const CACHE = { "Cache-Control": "public, max-age=3600" };

/** Crawlers see the public pages only; rooms, accounts, admin and auth stay private. */
export function robotsTxt(request: Request): Response {
  const body = [
    "User-agent: *",
    ...PUBLIC_PATHS.map((path) => `Allow: ${path === "/" ? "/$" : path}`),
    "Disallow: /",
    "",
    `Sitemap: ${publicOrigin(request)}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { ...CACHE, "Content-Type": "text/plain; charset=utf-8" } });
}

export function sitemapXml(request: Request): Response {
  const origin = publicOrigin(request);
  const urls = PUBLIC_PATHS.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, {
    headers: { ...CACHE, "Content-Type": "application/xml; charset=utf-8" },
  });
}
