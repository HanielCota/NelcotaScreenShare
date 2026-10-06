import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Cartão das telas de acesso (login, 2FA, senha, convite), do admin e do app.
 * Dentro do layout dividido do app (`data-layout="split"`), vira o próprio
 * formulário: sem fundo de cartão e sem o ícone (o mascote ao lado já faz
 * esse papel).
 */
export function AuthCard({
  icon: Icon,
  title,
  description,
  top,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Acima do título (ex.: as abas Entrar | Criar conta, contexto da sala). */
  top?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="glass w-full max-w-sm rounded-2xl p-7 group-data-[layout=split]/access:border-0 group-data-[layout=split]/access:bg-transparent group-data-[layout=split]/access:p-0! group-data-[layout=split]/access:shadow-none group-data-[layout=split]/access:backdrop-filter-none sm:p-8">
      {top ? <div className="mb-6 flex flex-col gap-4">{top}</div> : null}
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 group-data-[layout=split]/access:hidden">
        <Icon className="size-5 text-brand-soft" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight group-data-[layout=split]/access:mt-0 group-data-[layout=split]/access:text-2xl">
        {title}
      </h1>
      {description ? <p className="mt-1.5 text-sm text-ink-muted">{description}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div> : null}
    </div>
  );
}
