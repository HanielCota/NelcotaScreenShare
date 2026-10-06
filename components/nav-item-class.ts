/**
 * Classe dos itens da navbar. Fica fora de NavBar.tsx ("use client") para
 * que componentes de servidor recebam o texto, e não uma referência de cliente.
 */
export const navItemClass =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink focus-visible:bg-surface-3 data-[state=open]:bg-surface-3 data-[state=open]:text-ink";
