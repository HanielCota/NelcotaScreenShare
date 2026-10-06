import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto enquanto a página do painel carrega (mesmo tamanho do conteúdo real). */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-56 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
