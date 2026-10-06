import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-2">
          <SearchX className="size-5 text-brand-soft" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-ink-muted">O endereço não existe ou mudou.</p>
        <Button asChild className="mt-6">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
