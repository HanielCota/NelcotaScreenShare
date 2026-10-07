import { createContext, use, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SettingsRowLabel } from "./Settings";

const RowContext = createContext<(() => void) | null>(null);

/** Evento para abrir uma linha pelo id (ex.: o "Ativar" do checklist). */
export const OPEN_ROW_EVENT = "conta:abrir-linha";

/**
 * Fecha a linha expansível em volta, se houver. Formulários usam para o
 * "Cancelar" e para fechar depois de salvar; fora de uma linha, devolve null.
 */
export function useCloseRow(): (() => void) | null {
  return use(RowContext);
}

/**
 * Linha que mostra só o estado atual e um botão; o formulário abre na própria
 * linha. O conteúdo fica montado ao fechar (`hidden`): um fluxo em andamento,
 * como os códigos de backup, não se perde. Foco vai ao primeiro campo ao abrir
 * e volta ao botão ao fechar.
 */
export function ExpandableRow({
  id,
  title,
  description,
  summary,
  actionLabel,
  openLabel = "Fechar",
  danger = false,
  children,
}: {
  /** Âncora da linha: `/conta#id` abre a linha já expandida. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Estado atual, ao lado do botão (ex.: o e-mail, "Desativada"). */
  summary?: ReactNode;
  actionLabel: string;
  /** Texto do botão com a linha aberta. */
  openLabel?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const row = useRef<HTMLDivElement>(null);
  // Aberta por âncora ou evento: rola até a linha antes de focar o campo.
  const revealOnOpen = useRef(false);

  // Abre pela âncora na URL ou pelo evento (o mesmo link clicado de novo
  // não muda o hash, então o evento cobre esse caso).
  useEffect(() => {
    if (!id) return;
    const reveal = () => {
      revealOnOpen.current = true;
      setOpen(true);
    };
    const openIfTarget = () => {
      if (window.location.hash === `#${id}`) reveal();
    };
    const onOpen = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === id) reveal();
    };
    openIfTarget();
    window.addEventListener("hashchange", openIfTarget);
    window.addEventListener(OPEN_ROW_EVENT, onOpen);
    return () => {
      window.removeEventListener("hashchange", openIfTarget);
      window.removeEventListener(OPEN_ROW_EVENT, onOpen);
    };
  }, [id]);

  useEffect(() => {
    if (open) {
      const field = content.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]), textarea, select, button",
      );
      if (revealOnOpen.current) {
        revealOnOpen.current = false;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        row.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        field?.focus({ preventScroll: true });
      } else {
        field?.focus();
      }
    } else if (wasOpen.current) {
      trigger.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <div
      ref={row}
      id={id}
      className="grid scroll-mt-6 gap-4 px-5 py-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-x-6 sm:px-6"
    >
      <SettingsRowLabel id={titleId} title={title} description={description} />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:self-center">
        <div className="min-w-0 text-sm text-ink-muted">{summary}</div>
        <Button
          ref={trigger}
          type="button"
          variant={open ? "ghost" : danger ? "destructive" : "outline"}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(!open)}
        >
          {open ? openLabel : actionLabel}
        </Button>
      </div>
      <section
        ref={content}
        id={contentId}
        aria-labelledby={titleId}
        hidden={!open}
        className="min-w-0 sm:col-start-2"
      >
        <RowContext value={() => setOpen(false)}>{children}</RowContext>
      </section>
    </div>
  );
}
