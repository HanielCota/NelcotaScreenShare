"use client";

import { ArrowRight, ChevronRight, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { celebrateMascot, upsetMascot } from "@/components/mascot/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateRoomCode, roomCodeSchema, roomPath } from "@/lib/livekit";
import { formText } from "@/lib/utils";

interface JoinFormProps {
  invalidCode: boolean;
  pending: boolean;
  onNavigate: (href: string) => void;
}

/**
 * Ações da home: "Criar sala" e, ao lado, "Tenho um código", que abre o
 * campo do código (já aberto quando o código do link era inválido).
 * O nome é pedido só na pré-entrada da sala.
 */
export function JoinForm({ invalidCode, pending, onNavigate }: JoinFormProps) {
  const codeId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(invalidCode);
  const [error, setError] = useState(
    invalidCode
      ? "Esse convite não é válido. Confira o código ou peça um novo link a quem enviou."
      : undefined,
  );

  useEffect(() => {
    if (invalidCode) {
      codeRef.current?.focus();
      upsetMascot("worried", codeRef.current ?? undefined);
    }
  }, [invalidCode]);

  function go(code: string) {
    if (pending) return;
    celebrateMascot();
    onNavigate(roomPath(code));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const rawCode = formText(new FormData(event.currentTarget), "code");
    const code = roomCodeSchema.safeParse(rawCode);
    if (code.success) {
      go(code.data);
    } else {
      setError(
        rawCode.trim() === ""
          ? "Digite o código da sala que recebeu no convite."
          : "Confira o código da sala. Use apenas letras, números e hífens, como kfa-mtrx-q2p.",
      );
      codeRef.current?.focus();
      upsetMascot("grumpy", codeRef.current ?? undefined);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" disabled={pending} onClick={() => go(generateRoomCode())}>
          <Plus aria-hidden="true" />
          {pending ? "Abrindo sala…" : "Criar sala"}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          aria-expanded={open}
          aria-controls={`${codeId}-form`}
          onClick={() => {
            setOpen((value) => !value);
            // Abriu: o foco já vai para o campo.
            if (!open) requestAnimationFrame(() => codeRef.current?.focus());
          }}
        >
          Tenho um código
          <ChevronRight
            aria-hidden="true"
            className={open ? "rotate-90 transition-transform" : "transition-transform"}
          />
        </Button>
      </div>

      {open ? (
        <form
          id={`${codeId}-form`}
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full max-w-sm flex-col gap-2"
        >
          <Label htmlFor={codeId} className="sr-only">
            Código da sala
          </Label>
          <div className="relative">
            <Input
              ref={codeRef}
              id={codeId}
              name="code"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Código da sala, ex.: kfa-mtrx-q2p"
              maxLength={32}
              onChange={() => setError(undefined)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${codeId}-error` : undefined}
              className="h-12 rounded-full pr-14 pl-5 text-base font-medium tracking-wide"
            />
            <button
              type="submit"
              disabled={pending}
              aria-label="Entrar na sala"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand text-brand-ink transition-transform hover:bg-brand-hover active:scale-95 disabled:opacity-40"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          {error ? (
            <p id={`${codeId}-error`} className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
