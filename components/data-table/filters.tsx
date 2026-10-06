"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Download, Search, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Campos de filtro das tabelas do painel (mesmo visual em todas as telas). */
export const SELECT_CLASS =
  "h-9 rounded-lg border border-input bg-surface-2 px-2.5 text-sm text-ink";

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs text-ink-subtle">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  /** Opção "sem filtro"; sem ela, o select sempre tem um valor. */
  allLabel?: string;
  onChange: (value: T | null) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        className={SELECT_CLASS}
        value={value ?? ""}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          onChange(next ? next.value : null);
        }}
      >
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type="date"
        className="h-9"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      />
    </Field>
  );
}

/** Campo de texto com estado local (quem chama atualiza a URL com debounce). */
export function FilterSearch({
  label,
  placeholder,
  value,
  onChange,
  type = "search",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** "text": busca exata (IDs), sem a lupa. */
  type?: "search" | "number" | "text";
}) {
  const id = useId();
  const [text, setText] = useState(value);
  // A URL foi limpa por fora (botão "Limpar"): o campo acompanha.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value === "") setText("");
  }
  return (
    <Field label={label} htmlFor={id} className={type === "number" ? "w-32" : "min-w-48 flex-1"}>
      <div className="relative">
        {type === "search" ? (
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
        ) : null}
        <Input
          id={id}
          type={type}
          min={type === "number" ? 0 : undefined}
          value={text}
          placeholder={placeholder}
          className={cn("h-9", type === "search" && "pl-8")}
          onChange={(event) => {
            setText(event.target.value);
            onChange(event.target.value);
          }}
        />
      </div>
    </Field>
  );
}

/** Alterna crescente/decrescente da ordenação escolhida. */
export function SortDirection({
  value,
  onChange,
}: {
  value: "asc" | "desc";
  onChange: (value: "asc" | "desc") => void;
}) {
  const desc = value === "desc";
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-9"
      aria-label={
        desc ? "Ordem decrescente: mudar para crescente" : "Ordem crescente: mudar para decrescente"
      }
      onClick={() => onChange(desc ? "asc" : "desc")}
    >
      {desc ? <ArrowDownWideNarrow aria-hidden="true" /> : <ArrowUpNarrowWide aria-hidden="true" />}
    </Button>
  );
}

/** "Limpar" (com filtro ativo) e "Exportar CSV" (com permissão), no fim da barra de filtros. */
export function FilterActions({
  active,
  onClear,
  exportHref,
}: {
  active: boolean;
  onClear: () => void;
  exportHref: string | null;
}) {
  return (
    <span className="flex gap-2">
      {active ? (
        <Button variant="ghost" size="sm" className="h-9" onClick={onClear}>
          <X aria-hidden="true" />
          Limpar
        </Button>
      ) : null}
      {exportHref ? (
        <Button asChild variant="outline" size="sm" className="h-9">
          <a href={exportHref} download>
            <Download aria-hidden="true" />
            Exportar CSV
          </a>
        </Button>
      ) : null}
    </span>
  );
}
