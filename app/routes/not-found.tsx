import { SearchX } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";

export const meta = () => [{ title: "Página não encontrada · Nelcota" }];
export const loader = () => new Response(null, { status: 404 });

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ParticipantHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-2">
            <SearchX className="size-5 text-brand-soft" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-medium tracking-tight">Página não encontrada</h1>
          <p className="mt-2 text-ink-muted">O endereço não existe ou mudou.</p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
