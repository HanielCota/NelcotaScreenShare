import { toast } from "sonner";
import type { OperationResult } from "@/lib/operations/operation";
import { reportBrowserError } from "@/lib/telemetry.client";

/**
 * "… · Desfazer" toast for 10 s. Undo calls the action directly (not through
 * a hook): the selection bar that triggered the deletion has already left the
 * screen, and the undo result still needs to show.
 */
export function toastWithUndo(
  message: string,
  undo: () => Promise<OperationResult<unknown>>,
  undoneMessage: string,
) {
  toast.success(message, {
    duration: 10_000,
    action: {
      label: "Desfazer",
      onClick: () => {
        undo()
          .then((result) => {
            if (result.serverError) {
              toast.error(result.serverError);
              return;
            }
            toast.success(undoneMessage);
          })
          .catch((error: unknown) => {
            reportBrowserError(error);
            toast.error("Não foi possível desfazer. Tente de novo.");
          });
      },
    },
  });
}
