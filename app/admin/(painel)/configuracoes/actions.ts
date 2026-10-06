"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, adminAction } from "@/server/actions/client";
import { mascotSettings, saveSetting, SettingsUnavailableError } from "@/server/settings";

const mascotInput = z.object({
  saturationDark: z.number(),
  saturationLight: z.number(),
});

/** Saturação do mascote por tema (só owner: settings.update). */
export const saveMascotSettings = adminAction
  .metadata({ name: "settings.saveMascot", permission: { settings: ["update"] } })
  .inputSchema(mascotInput)
  .action(async ({ parsedInput }) => {
    try {
      await saveSetting(mascotSettings, parsedInput);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ActionError("A saturação precisa ficar entre 0% e 200%.");
      }
      if (error instanceof SettingsUnavailableError) {
        throw new ActionError("Banco de dados não configurado: defina DATABASE_URL no servidor.");
      }
      throw error;
    }
    // Páginas já abertas no navegador (cache do roteador) pegam o valor novo.
    revalidatePath("/", "layout");
    return { saved: true };
  });
