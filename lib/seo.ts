import type { MetaDescriptor } from "react-router";

/** Pages search engines may index; everything else (rooms, account, admin, auth) stays out. */
export const PUBLIC_PATHS = ["/", "/novidades", "/privacidade"] as const;

/** Route `handle` of a public page: the root layout skips the noindex tag for it. */
export const INDEXABLE = { indexable: true } as const;

export function isIndexable(handle: unknown): boolean {
  if (typeof handle !== "object" || handle === null) return false;
  return "indexable" in handle && handle.indexable === true;
}

const OG_IMAGE = { path: "/og.png", width: 1200, height: 630 } as const;

/** The origin published in links and previews, read from the root loader data. */
export function originFromMatches(
  matches: readonly ({ id: string; loaderData: unknown } | undefined)[],
) {
  const root = matches.find((match) => match?.id === "root")?.loaderData;
  if (typeof root !== "object" || root === null || !("origin" in root)) return "";
  return typeof root.origin === "string" ? root.origin : "";
}

/**
 * Title, description, canonical URL and the Open Graph / Twitter tags, so a link pasted
 * in Slack, WhatsApp or Discord shows a preview card.
 */
export function pageMeta({
  title,
  description,
  path,
  origin,
}: {
  title: string;
  description: string;
  path: string;
  origin: string;
}): MetaDescriptor[] {
  const url = `${origin}${path}`;
  const image = `${origin}${OG_IMAGE.path}`;
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Nelcota" },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: String(OG_IMAGE.width) },
    { property: "og:image:height", content: String(OG_IMAGE.height) },
    { property: "og:image:alt", content: "Nelcota: compartilhamento de tela com som e ponteiro" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}
