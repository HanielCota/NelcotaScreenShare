import type { Metadata } from "next";
import { MascotSettingsForm } from "@/features/admin/settings/ui/MascotSettingsForm";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { can } from "@/features/auth/server/permissions";
import { getSetting, MASCOT_SATURATION, mascotSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Configurações" };

export default async function AdminSettingsPage() {
  const admin = await requireAdmin({ settings: ["read"] });
  const mascot = await getSetting(mascotSettings);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      <MascotSettingsForm
        initial={mascot}
        limits={MASCOT_SATURATION}
        canEdit={can(admin.user.role, { settings: ["update"] })}
      />
    </>
  );
}
