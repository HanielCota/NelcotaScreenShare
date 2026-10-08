import { defineAdminOperation } from "@/features/auth/server/operation-policies.server";
import { diffChanges } from "@/server/audit.server";
import { getDb } from "@/server/db/index.server";
import {
  getSetting,
  invalidateSetting,
  mascotSettings,
  saveSetting,
} from "@/features/admin/settings/server/settings.server";

/** Mascot saturation per theme (owner only: settings.update). */
export const saveMascotSettings = defineAdminOperation(
  {
    name: "settings.saveMascot",
    permission: { settings: ["update"] },
    audit: "required",
  },
  mascotSettings.schema,
  async ({ parsedInput, ctx }) => {
    const db = getDb();
    const before = await getSetting(mascotSettings, db);
    await db.transaction(async (tx) => {
      const after = await saveSetting(mascotSettings, parsedInput, tx, ctx.admin.user.id);
      await ctx.audit.record(tx, {
        action: "settings.update",
        resourceType: "app_settings",
        resourceId: mascotSettings.key,
        changes: diffChanges(before, after),
      });
    });
    // A page read between saveSetting and the commit may have cached the old value.
    invalidateSetting(mascotSettings.key);
    return { saved: true };
  },
);
