import { Outlet } from "react-router";
import { AppHeader } from "@/components/shell/AppHeader";
import { AccessShell } from "@/features/auth/ui/AccessShell";

export const meta = () => [{ title: "Admin · Nelcota" }];

/** Admin panel access screens: outside the shell, reachable without a session. */
export default function AdminAuthLayout() {
  return (
    <AccessShell
      scope="admin"
      header={
        <AppHeader
          account={null}
          showAuthLinks={false}
          actions={<span className="px-2 text-sm text-ink-muted">Painel admin</span>}
        />
      }
    >
      <Outlet />
    </AccessShell>
  );
}
