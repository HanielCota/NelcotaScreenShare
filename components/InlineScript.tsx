/**
 * Inline script that only runs in the server HTML (before the first paint).
 * On the client it becomes `text/plain`: React warns when rendering <script> and
 * it would never run anyway. `suppressHydrationWarning` covers the `type`
 * difference and the `nonce`, which the browser hides after reading it.
 */
export function InlineScript({ html, nonce }: { html: string; nonce?: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
