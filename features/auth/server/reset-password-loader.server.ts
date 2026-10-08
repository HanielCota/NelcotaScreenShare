import { routeLoader } from "@/server/route-loader.server";

/** Better Auth redirects here with ?token=… (or ?error=INVALID_TOKEN). */
export const resetPasswordLoader = routeLoader(({ searchParams }) => {
  const { token, error } = searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return { token: valid ? token : undefined };
});
