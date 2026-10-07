import { useRouteError, useRevalidator, isRouteErrorResponse } from "react-router";
import AdminNotFound from "./AdminNotFound";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Unexpected error on an admin page: message without internal details + a code for support. */
export function AdminErrorBoundary() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const retry = () => {
    void revalidator.revalidate();
  };
  if (isRouteErrorResponse(error) && error.status === 404) return <AdminNotFound />;
  return (
    <div role="alert" className="glass mx-auto mt-8 w-full max-w-md rounded-2xl p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger/15">
        <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-medium tracking-tight">Algo deu errado</h1>
      <p className="mt-2 text-ink-muted">
        Não foi possível carregar esta tela. Tente de novo em instantes.
      </p>
      <Button className="mt-6" onClick={() => retry()}>
        <RotateCcw aria-hidden="true" />
        Tentar de novo
      </Button>
    </div>
  );
}
