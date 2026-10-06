import type { Metadata } from "next";
import { MascotSettingsForm } from "@/components/admin/MascotSettingsForm";
import { requireAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";
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
