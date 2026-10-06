"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, adminAction } from "@/server/actions/client";
import { diffChanges } from "@/server/audit/record";
import { getDb } from "@/server/db";
import { getSetting, invalidateSetting, mascotSettings, saveSetting } from "@/server/settings";

const mascotInput = z.object({
  saturationDark: z.number(),
  saturationLight: z.number(),
});

/** Saturação do mascote por tema (só owner: settings.update). */
export const saveMascotSettings = adminAction
  .metadata({
    name: "settings.saveMascot",
    permission: { settings: ["update"] },
    audit: "required",
  })
  .inputSchema(mascotInput)
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    if (!db) throw new ActionError("Banco de dados não configurado.");
    const before = await getSetting(mascotSettings, db);
    try {
      await db.transaction(async (tx) => {
        const after = await saveSetting(mascotSettings, parsedInput, tx, ctx.admin.user.id);
        await ctx.audit.record(tx, {
          action: "settings.update",
          resourceType: "app_settings",
          resourceId: mascotSettings.key,
          changes: diffChanges(before, after),
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ActionError("A saturação precisa ficar entre 0% e 200%.");
      }
      throw error;
    } finally {
      invalidateSetting(mascotSettings.key);
    }
    // Páginas já abertas no navegador (cache do roteador) pegam o valor novo.
    revalidatePath("/", "layout");
    return { saved: true };
  });
