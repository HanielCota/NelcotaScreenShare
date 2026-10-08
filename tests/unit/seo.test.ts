import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { isIndexable, originFromMatches, pageMeta } from "@/lib/seo";
import { robotsTxt, sitemapXml } from "@/server/seo.server";

const env = vi.hoisted(() => ({ APP_URL: "https://nelcota.app" as string | undefined }));
vi.mock("@/server/env.server", () => ({ getEnv: () => env }));

const request = new Request("http://127.0.0.1:3000/robots.txt");

test("robots.txt opens only the public pages and points to the sitemap", async () => {
  const body = await robotsTxt(request).text();
  assert.match(body, /^Allow: \/\$$/m);
  assert.match(body, /^Allow: \/novidades$/m);
  assert.match(body, /^Allow: \/privacidade$/m);
  assert.match(body, /^Disallow: \/$/m);
  assert.match(body, /^Sitemap: https:\/\/nelcota\.app\/sitemap\.xml$/m);
});

test("the sitemap lists the public pages with absolute URLs", async () => {
  const body = await sitemapXml(request).text();
  assert.deepEqual(
    [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
    ["https://nelcota.app/", "https://nelcota.app/novidades", "https://nelcota.app/privacidade"],
  );
});

test("without APP_URL, links use the request origin", async () => {
  env.APP_URL = undefined;
  assert.match(await robotsTxt(request).text(), /Sitemap: http:\/\/127\.0\.0\.1:3000\//);
  env.APP_URL = "https://nelcota.app";
});

test("page meta builds absolute preview URLs from the root origin", () => {
  const origin = originFromMatches([{ id: "root", loaderData: { origin: "https://nelcota.app" } }]);
  const meta = pageMeta({ title: "T", description: "D", path: "/novidades", origin });
  assert.ok(meta.some((tag) => "property" in tag && tag.content === "https://nelcota.app/og.png"));
  assert.ok(meta.some((tag) => "href" in tag && tag.href === "https://nelcota.app/novidades"));
  assert.equal(originFromMatches([{ id: "home", loaderData: {} }]), "");
});

test("only routes marked as indexable skip the noindex tag", () => {
  assert.equal(isIndexable({ indexable: true }), true);
  assert.equal(isIndexable({ indexable: "yes" }), false);
  assert.equal(isIndexable(undefined), false);
});
