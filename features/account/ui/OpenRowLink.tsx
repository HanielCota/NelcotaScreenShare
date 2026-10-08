import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OPEN_ROW_EVENT } from "./settings/ExpandableRow";

/** Goes to an expandable row on the page and opens it (works when clicked again). */
export function OpenRowLink({ row, children }: { row: string; children: ReactNode }) {
  return (
    <Button asChild>
      <a
        href={`#${row}`}
        onClick={(event) => {
          // No native navigation to the anchor: it would steal focus from the field
          // the row focuses when opening. The row scrolls to itself.
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
