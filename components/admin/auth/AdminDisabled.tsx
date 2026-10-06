import { PowerOff } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";

/** Sem banco ou sem ADMIN_AUTH_SECRET o painel não liga. */
export function AdminDisabled() {
  return (
    <AuthCard
      icon={PowerOff}
      title="Painel admin desligado"
      description={
        <>
          Defina <code>DATABASE_URL</code> e <code>ADMIN_AUTH_SECRET</code> nas variáveis de
          ambiente do servidor e crie o primeiro dono com{" "}
          <code>node create-owner.mjs email@exemplo.com</code>.
        </>
      }
    >
      <p className="text-sm text-ink-subtle">Veja a seção “Painel admin” do README.</p>
    </AuthCard>
  );
}
