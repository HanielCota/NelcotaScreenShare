"use client";

import { ArrowRight, Link2, Loader2, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  celebrateMascot,
  nodMascot,
  setMascotDoubt,
  upsetMascot,
} from "@/components/mascot/events";
import { generateRoomCode, roomLink, roomPath } from "@/lib/livekit";
import { parseRoomInput, type RoomInput } from "@/lib/room-input";
import { cn } from "@/lib/utils";

interface SmartBarProps {
  invalidCode: boolean;
  pending: boolean;
  onNavigate: (href: string) => void;
  /** Mascote "espiando" por cima da barra. */
  mascot?: ReactNode;
}

function hintFor(input: RoomInput): { text: ReactNode; tone: "muted" | "ok" | "error" } {
  switch (input.kind) {
    case "empty":
      return {
        text: (
          <>
            <span className="max-sm:hidden">
              <kbd className="inline-flex h-5 items-center rounded-md border border-line px-1.5 align-[-0.15em] font-sans text-[11px] leading-none">
                Enter
              </kbd>{" "}
              cria uma sala nova. Recebeu um link? Cole aqui.
            </span>
            <span className="sm:hidden">Toque em Criar sala ou cole o link que recebeu.</span>
          </>
        ),
        tone: "muted",
      };
    case "room":
      return {
        text: (
          <>
            Entrar na sala <strong className="font-mono font-semibold">{input.code}</strong>
            {input.invite ? " com o convite" : ""}
          </>
        ),
        tone: "ok",
      };
    case "invalid":
      return {
        text:
          input.reason === "not-a-room"
            ? "Esse link não é de uma sala do Nelcota."
            : "Confira o código: letras, números e hífens, como kfa-mtrx-q2p.",
        tone: "error",
      };
  }
}

/**
 * A barra da home: vazia, cria uma sala; com um código ou um link colado
 * (com ou sem convite), entra. Tecla "/" em qualquer lugar foca a barra.
 */
export function SmartBar({ invalidCode, pending, onNavigate, mascot }: SmartBarProps) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [linkError, setLinkError] = useState(invalidCode);
  const input = parseRoomInput(text);
  const hint = linkError
    ? {
        text: "Esse convite não é válido. Confira o código ou peça um novo link a quem enviou.",
        tone: "error" as const,
      }
    : hintFor(input);

  useEffect(() => {
    if (!invalidCode) return;
    inputRef.current?.focus();
    upsetMascot("worried", inputRef.current ?? undefined);
  }, [invalidCode]);

  // "/" foca a barra (fora de campos de texto), como em buscadores.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => () => setMascotDoubt(false), []);

  function handleChange(value: string) {
    setText(value);
    setLinkError(false);
    const next = parseRoomInput(value);
    setMascotDoubt(next.kind === "invalid" && value.trim().length > 3);
    if (next.kind === "room" && input.kind !== "room") nodMascot();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (input.kind === "invalid") {
      inputRef.current?.focus();
      upsetMascot("grumpy", inputRef.current ?? undefined);
      return;
    }
    celebrateMascot();
    onNavigate(
      input.kind === "room" ? roomLink(input.code, input.invite) : roomPath(generateRoomCode()),
    );
  }

  // "Criar sala" só com a barra vazia; com texto, a pessoa está tentando entrar.
  const creating = input.kind === "empty";
  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col items-center gap-3">
      <div className="relative w-full">
        {mascot ? (
          // Inteiro, "sentado" na barra: só a sombra dos pés fica atrás dela.
          // Continua clicável (ele reage a toques).
          <div aria-hidden="true" className="relative z-0 -mb-3 flex justify-center">
            {mascot}
          </div>
        ) : null}
        <div
          className={cn(
            "relative z-10 flex h-16 items-center gap-2 rounded-full border border-line bg-surface pr-2 pl-5 shadow-[0_12px_32px_-20px_rgb(0_0_0/0.45)] transition-colors focus-within:border-brand/60",
            hint.tone === "error" && "border-danger/60 focus-within:border-danger/70",
          )}
        >
          <Link2 className="size-5 shrink-0 text-ink-subtle max-sm:hidden" aria-hidden="true" />
          <label htmlFor={inputId} className="sr-only">
            Link ou código da sala
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Link ou código da sala"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            aria-describedby={hintId}
            aria-invalid={hint.tone === "error" || undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle sm:text-lg"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-brand px-5 text-base font-semibold text-brand-ink transition-[transform,background-color] duration-200 hover:bg-brand-hover active:scale-[0.97] disabled:opacity-60 motion-reduce:active:scale-100"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : creating ? (
              <Plus className="size-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
            {pending ? "Abrindo…" : creating ? "Criar sala" : "Entrar"}
          </button>
        </div>
      </div>
      <p
        id={hintId}
        aria-live="polite"
        className={cn(
          "min-h-5 px-4 text-center text-sm",
          hint.tone === "muted" && "text-ink-subtle",
          hint.tone === "ok" && "text-ink",
          hint.tone === "error" && "text-danger",
        )}
      >
        {hint.text}
      </p>
    </form>
  );
}
