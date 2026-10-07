import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Grupo de ajustes com âncora (`/conta#id`): título fora do cartão e as linhas
 * dentro, separadas por divisórias. `danger` marca a zona de exclusão.
 */
export function SettingsSection({
  id,
  title,
  description,
  danger = false,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      // Alvo de âncora (/conta#seguranca): recebe o foco ao pular para a seção.
      tabIndex={-1}
      className="flex scroll-mt-6 flex-col gap-3 outline-none"
    >
      <div className="px-1">
        <h2
          id={headingId}
          className={cn("text-lg font-medium tracking-tight", danger && "text-danger")}
        >
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      <div
        className={cn(
          "divide-y overflow-hidden rounded-2xl border bg-surface",
          danger ? "divide-danger/20 border-danger/35" : "divide-line border-line",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Rótulo e explicação à esquerda; o controle à direita (empilha no celular). */
export function SettingsRow({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-6 sm:px-6">
      <SettingsRowLabel title={title} description={description} />
      <div className="min-w-0 sm:self-center">{children}</div>
    </div>
  );
}

export function SettingsRowLabel({
  title,
  description,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  return (
    <div className="min-w-0">
      <h3 id={id} className="text-sm font-medium">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

/** Lista que ocupa a largura toda do cartão (ex.: sessões). */
export function SettingsBlock({ children }: { children: ReactNode }) {
  return <div className="px-5 py-3 sm:px-6">{children}</div>;
}
