import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OPEN_ROW_EVENT } from "./settings/ExpandableRow";

/** Leva até uma linha expansível da página e a abre (funciona clicando de novo). */
export function OpenRowLink({ row, children }: { row: string; children: ReactNode }) {
  return (
    <Button asChild size="sm">
      <a
        href={`#${row}`}
        onClick={(event) => {
          // Sem a navegação nativa até a âncora: ela tiraria o foco do campo
          // que a linha foca ao abrir. A própria linha rola até ela.
          event.preventDefault();
          window.history.replaceState(null, "", `#${row}`);
          window.dispatchEvent(new CustomEvent(OPEN_ROW_EVENT, { detail: row }));
        }}
      >
        {children}
      </a>
    </Button>
  );
}
