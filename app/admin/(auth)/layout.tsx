import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NavBrand } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Admin" };

/** Telas de acesso do painel: fora do shell, acessíveis sem sessão. */
export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-sm items-center justify-between">
        <NavBrand href="/" />
        <span className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Painel admin
          </span>
          <ThemeToggle />
        </span>
      </div>
      {children}
    </main>
  );
}
