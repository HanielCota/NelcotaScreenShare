"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { displayNameSchema } from "@/lib/livekit";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * "Você vai entrar como": muda o nome aqui mesmo, sem sair da pré-entrada
 * (antes, "Mudar" levava para outra página e a pessoa se perdia).
 */
export function NameRow({ name, onChange }: { name: string; onChange: (name: string) => void }) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Abriu a edição: o campo já vem selecionado para digitar por cima.
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function save() {
    const parsed = displayNameSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira o nome.");
      inputRef.current?.focus();
      return;
    }
    if (parsed.data === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error: failure } = await authClient.updateUser({ name: parsed.data });
    setSaving(false);
    if (failure) {
      setError("Não foi possível salvar o nome. Tente de novo.");
      return;
    }
    onChange(parsed.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <label htmlFor={inputId} className="text-xs text-ink-subtle">
          Seu nome na sala
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            value={draft}
            maxLength={32}
            autoComplete="name"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(undefined);
            }}
            onKeyDown={(event) => {
              // Enter salva o nome (não envia o formulário da sala); Esc cancela.
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              } else if (event.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-brand/60"
          />
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Salvar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(name);
              setError(undefined);
              setEditing(false);
            }}
          >
            Cancelar
          </Button>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand-soft"
      >
        {initialsOf(name) || "?"}
      </span>
      <p className="min-w-0 flex-1">
        <span className="block text-xs text-ink-subtle">Você vai entrar como</span>
        <strong className="block truncate font-semibold">{name}</strong>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        Mudar nome
      </Button>
    </div>
  );
}
