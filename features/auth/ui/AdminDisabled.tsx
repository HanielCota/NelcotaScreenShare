import { PowerOff } from "lucide-react";
import { AuthCard } from "./AuthCard";

/** Without a database or ADMIN_AUTH_SECRET the panel does not start. */
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
      <p className="text-sm text-ink-subtle">
        Veja o guia de contas e painel em docs/accounts-and-admin.md.
      </p>
    </AuthCard>
  );
}
