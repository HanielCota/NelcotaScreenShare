import { Outlet } from "react-router";
import { AppHeader } from "@/components/shell/AppHeader";
import { BrandPanel } from "@/features/auth/ui/BrandPanel";

export const meta = () => [{ title: "Admin · Nelcota" }];

/** Admin panel access screens: outside the shell, reachable without a session. */
export default function AdminAuthLayout() {
  return (
    <div className="apple-buttons flex min-h-dvh flex-col">
      <AppHeader
        account={null}
        showAuthLinks={false}
        actions={<span className="px-2 text-sm text-ink-muted">Painel admin</span>}
      />
      <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-8 sm:px-6 lg:justify-center lg:py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-[34rem] lg:grid-cols-[5fr_6fr]">
          <BrandPanel scope="admin" />
          <div
            data-layout="split"
            className="group/access flex flex-col items-center justify-center px-5 py-7 sm:px-10 sm:py-10"
          >
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
