/**
 * Script inline que roda só no HTML do servidor (antes da primeira pintura).
 * No cliente vira `text/plain`: o React avisa ao renderizar <script> e ele
 * nunca executaria mesmo. `suppressHydrationWarning` cobre a diferença de
 * `type` e o `nonce`, que o navegador esconde depois de ler.
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
