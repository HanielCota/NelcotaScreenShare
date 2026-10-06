"use client";

import { ArrowRight, Plus } from "lucide-react";
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

/** O nome é pedido só na pré-entrada da sala. */
export function JoinForm({ invalidCode, pending, onNavigate }: JoinFormProps) {
  const codeId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
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
    <div className="flex flex-col gap-6">
      <Button size="lg" disabled={pending} onClick={() => go(generateRoomCode())}>
        <Plus aria-hidden="true" />
        {pending ? "Abrindo sala…" : "Criar sala"}
      </Button>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-2 border-t border-line pt-6"
      >
        <Label htmlFor={codeId} className="justify-center text-sm font-medium text-ink-muted">
          Ou entre com um código
        </Label>
        <div className="flex gap-2">
          <Input
            ref={codeRef}
            id={codeId}
            name="code"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ex.: kfa-mtrx-q2p"
            maxLength={32}
            onChange={() => {
              setError(undefined);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${codeId}-error` : undefined}
            className="font-medium tracking-wide"
          />
          <Button type="submit" variant="outline" size="lg" disabled={pending}>
            Entrar
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        {error ? (
          <p id={`${codeId}-error`} className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
