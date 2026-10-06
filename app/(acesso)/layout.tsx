import type { ReactNode } from "react";
import { NavBrand } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Telas de acesso da conta de participante (fora da navbar da home). */
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-sm items-center justify-between">
        <NavBrand href="/" />
        <ThemeToggle />
      </div>
      {children}
    </main>
  );
}
