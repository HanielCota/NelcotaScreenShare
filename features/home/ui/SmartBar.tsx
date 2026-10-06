"use client";

import {
  ArrowRight,
  CircleAlert,
  ClipboardPaste,
  Link2,
  Loader2,
  Plus,
  Ticket,
  Video,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { celebrateMascot, nodMascot, setMascotDoubt, upsetMascot } from "@/features/mascot/events";
import { generateRoomCode, roomLink, roomPath } from "@/lib/livekit";
import { parseRoomInput, type RoomInput } from "@/features/room/domain/room-input";
import { cn } from "@/lib/utils";

interface SmartBarProps {
  invalidCode: boolean;
  pending: boolean;
  onNavigate: (href: string) => void;
  /** Mascote "espiando" por cima da barra. */
  mascot?: ReactNode;
}

/** Tecla desenhada como tecla de verdade (borda de baixo mais grossa). */
function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 border-line-strong bg-surface-2 px-1.5 font-sans text-xs font-semibold text-ink">
      {children}
    </kbd>
  );
}

/** Aviso de erro da barra: ícone + frase, alinhados mesmo quando quebra a linha. */
function ErrorHint({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1.5 text-left">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** Dica da barra vazia: dois atalhos curtos, lado a lado. */
const EMPTY_HINT = (
  <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
    <span className="inline-flex items-center gap-1.5 max-sm:hidden">
      <Keycap>Enter</Keycap>
      cria uma sala
    </span>
    <span aria-hidden="true" className="size-1 rounded-full bg-line-strong max-sm:hidden" />
    <span className="inline-flex items-center gap-1.5 max-sm:hidden">
      <ClipboardPaste className="size-4 text-ink-subtle" aria-hidden="true" />
      ou cole o link que recebeu
    </span>
    <span className="inline-flex items-center gap-1.5 sm:hidden">
      <ClipboardPaste className="size-4 text-ink-subtle" aria-hidden="true" />
      Toque em Criar sala ou cole o link que recebeu
    </span>
  </span>
);

/** Dica abaixo da barra: atalhos com a barra vazia; sala reconhecida; ou o erro. */
function hintFor(input: RoomInput): { text: ReactNode; tone: "muted" | "ok" | "error" } {
  switch (input.kind) {
    case "empty":
      return { text: EMPTY_HINT, tone: "muted" };
    case "room":
      return {
        text: (
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
            <span className="sr-only">Sala encontrada:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 py-0.5 pr-2.5 pl-2">
              <Video className="size-3.5 text-brand-soft" aria-hidden="true" />
              <span className="font-mono font-semibold text-ink">{input.code}</span>
            </span>
            {input.invite ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pr-2.5 pl-2 text-xs font-medium">
                <Ticket className="size-3.5 text-ink-subtle" aria-hidden="true" />
                convite
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-ink-muted max-sm:hidden">
              <Keycap>Enter</Keycap>
              para entrar
            </span>
          </span>
        ),
        tone: "ok",
      };
    case "invalid":
      return {
        text: (
          <ErrorHint>
            {input.reason === "not-a-room"
              ? "Esse link não é de uma sala do Nelcota."
              : "Confira o código: letras, números e hífens, como kfa-mtrx-q2p."}
          </ErrorHint>
        ),
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
        text: (
          <ErrorHint>
            Esse convite não é válido. Confira o código ou peça um novo link a quem enviou.
          </ErrorHint>
        ),
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
          // Os pés passam à frente da borda da barra, sem serem cortados por ela.
          <div className="relative z-20 flex justify-center">{mascot}</div>
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
          "flex min-h-7 items-center justify-center px-4 text-center text-sm",
          hint.tone === "muted" && "text-ink-muted",
          hint.tone === "ok" && "text-ink",
          hint.tone === "error" && "text-danger",
        )}
      >
        {/* Um filho só: no flex, texto e <strong> virariam itens e o espaço entre eles sumiria. */}
        <span>{hint.text}</span>
      </p>
    </form>
  );
}
