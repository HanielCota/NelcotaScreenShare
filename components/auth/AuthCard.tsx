import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Cartão das telas de acesso (login, 2FA, senha, convite), do admin e do app. */
export function AuthCard({
  icon: Icon,
  title,
  description,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="glass w-full max-w-sm rounded-2xl p-7 sm:p-8">
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2">
        <Icon className="size-5 text-brand-soft" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-ink-muted">{description}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div> : null}
    </div>
  );
}

/** Mensagem de erro do formulário, anunciada por leitores de tela. */
export function FormError({ id, message }: { id?: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="rounded-xl bg-danger/15 px-3 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}
