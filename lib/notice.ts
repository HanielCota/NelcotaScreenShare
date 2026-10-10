/**
 * Message for a `?aviso=` value. Only the page's own keys count: anything else,
 * including inherited names such as `constructor`, shows no notice.
 */
export function noticeFor(
  notices: Readonly<Record<string, string>>,
  key: unknown,
): string | undefined {
  if (typeof key !== "string" || !Object.hasOwn(notices, key)) return undefined;
  return notices[key];
}
