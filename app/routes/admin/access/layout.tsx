import { Outlet } from "react-router";
import { NavBrand } from "@/components/shell/NavBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export const meta = () => [{ title: "Admin · Nelcota" }];

/** Telas de acesso do painel: fora do shell, acessíveis sem sessão. */
export default function AdminAuthLayout() {
  const children = <Outlet />;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-sm items-center justify-between">
        <NavBrand href="/" />
        <span className="flex items-center gap-1">
          <span className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
            Painel admin
          </span>
          <ThemeToggle />
        </span>
      </div>
      {children}
    </main>
  );
}
