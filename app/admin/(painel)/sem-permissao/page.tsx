import { ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sem permissão" };

export default function NoPermissionPage() {
  return (
    <div className="glass mx-auto mt-8 w-full max-w-md rounded-2xl p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-2">
        <ShieldOff className="size-5 text-brand-soft" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Sem permissão</h1>
      <p className="mt-2 text-ink-muted">
        Seu papel não dá acesso a esta área. Se precisar, peça ao dono do painel.
      </p>
      <Button asChild className="mt-6">
        <Link href="/admin">Voltar ao início</Link>
      </Button>
    </div>
  );
}
