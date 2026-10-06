"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Erro inesperado numa página do painel: mensagem sem detalhes internos + código para o suporte. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="glass mx-auto mt-8 w-full max-w-md rounded-2xl p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger/15">
        <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Algo deu errado</h1>
      <p className="mt-2 text-ink-muted">
        Não foi possível carregar esta tela. Tente de novo em instantes.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-ink-subtle">
          Código para o suporte: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <Button className="mt-6" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </Button>
    </div>
  );
}
