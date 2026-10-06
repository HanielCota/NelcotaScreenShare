"use client";

import { toast } from "sonner";

interface ActionResult {
  serverError?: string;
}

/**
 * Toast "… · Desfazer" por 10 s. O desfazer chama a action direto (não por
 * um hook): a barra de seleção que disparou a exclusão já saiu da tela, e o
 * resultado do desfazer ainda precisa aparecer.
 */
export function toastWithUndo(
  message: string,
  undo: () => Promise<ActionResult | undefined>,
  undoneMessage: string,
) {
  toast.success(message, {
    duration: 10_000,
    action: {
      label: "Desfazer",
      onClick: () => {
        undo()
          .then((result) => {
            if (result?.serverError) toast.error(result.serverError);
            else toast.success(undoneMessage);
          })
          .catch(() => toast.error("Não foi possível desfazer. Tente de novo."));
      },
    },
  });
}
