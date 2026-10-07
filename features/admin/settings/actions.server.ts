import { z } from "zod";
import { defineAdminOperation } from "@/features/auth/server/operation-policies.server";
import { ActionError } from "@/server/operations/action-error";
import { diffChanges } from "@/server/audit.server";
import { getDb } from "@/server/db/index.server";
import {
  getSetting,
  invalidateSetting,
  mascotSettings,
  saveSetting,
} from "@/features/admin/settings/server/settings.server";

const mascotInput = z.object({
  saturationDark: z.number(),
  saturationLight: z.number(),
});

/** Saturação do mascote por tema (só owner: settings.update). */
export const saveMascotSettings = defineAdminOperation(
  {
    name: "settings.saveMascot",
    permission: { settings: ["update"] },
    audit: "required",
  },
  mascotInput,
  async ({ parsedInput, ctx }) => {
    const db = getDb();
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
    return { saved: true };
  },
);
