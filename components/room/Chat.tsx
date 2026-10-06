"use client";

import { useChat, type ReceivedChatMessage } from "@livekit/components-react";
import { Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShortcut } from "@/hooks/useShortcut";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/gsap";
import { CHAT_MAX_LENGTH } from "@/lib/room-data";
import { cn } from "@/lib/utils";

export interface ChatState {
  messages: ReceivedChatMessage[];
  send: (text: string) => Promise<unknown>;
  isSending: boolean;
  open: boolean;
  unread: number;
  setOpen: (open: boolean) => void;
}

function author(message: ReceivedChatMessage): string {
  if (message.from?.isLocal) return "Você";
  return message.from?.name || message.from?.identity || "Alguém";
}

const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/**
 * Estado do chat no nível da sala: as mensagens chegam mesmo com o painel
 * fechado (contador de não lidas e aviso). Atalho: C.
 */
export function useChatState(): ChatState {
  const { chatMessages, send, isSending } = useChat();
  const [open, setOpenState] = useState(false);
  // Mensagens já vistas: ao abrir ou fechar o painel, tudo até ali conta como lido.
  const [seen, setSeen] = useState(0);
  const announced = useRef(0);

  function setOpen(next: boolean) {
    setSeen(chatMessages.length);
    setOpenState(next);
  }

  // Painel fechado: avisa a mensagem nova de outra pessoa.
  useEffect(() => {
    const fresh = chatMessages.slice(announced.current);
    announced.current = chatMessages.length;
    if (open) return;
    const last = fresh.findLast((message) => !message.from?.isLocal);
    if (last) {
      toast(`${author(last)}: ${last.message}`, {
        action: { label: "Abrir", onClick: () => setOpenState(true) },
      });
    }
  }, [open, chatMessages]);

  useShortcut("c", () => setOpen(!open));

  const unread = open
    ? 0
    : chatMessages.slice(seen).filter((message) => !message.from?.isLocal).length;

  return { messages: chatMessages, send, isSending, open, unread, setOpen };
}

export function ChatPanel({ chat }: { chat: ChatState }) {
  const scope = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from(scope.current, { x: 24, opacity: 0, duration: 0.35 });
      });
    },
    { scope },
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mantém a última mensagem à vista.
  const count = chat.messages.length;
  useEffect(() => {
    const list = listRef.current;
    if (count > 0) list?.scrollTo({ top: list.scrollHeight });
  }, [count]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    const text = input?.value.trim();
    if (!input || !text || chat.isSending) return;
    try {
      await chat.send(text);
      input.value = "";
    } catch {
      toast.error("Não foi possível enviar a mensagem. Tente de novo.");
    }
  }

  return (
    <aside
      ref={scope}
      aria-label="Chat da sala"
      className="glass fixed top-20 right-3 bottom-32 z-40 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col rounded-3xl sm:right-6"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">Chat</h2>
        <button
          type="button"
          onClick={() => chat.setOpen(false)}
          aria-label="Fechar chat"
          className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      {chat.messages.length === 0 ? (
        <p className="flex flex-1 items-center px-6 text-center text-base text-ink-muted">
          Nenhuma mensagem ainda. As mensagens não ficam salvas: somem quando você sai da sala.
        </p>
      ) : (
        <ol
          ref={listRef}
          aria-live="polite"
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          {chat.messages.map((message) => (
            <li key={message.id} className="flex flex-col gap-0.5">
              <span className="flex items-baseline gap-2 text-sm">
                <span
                  className={cn(
                    "font-semibold",
                    message.from?.isLocal ? "text-brand-soft" : "text-ink",
                  )}
                >
                  {author(message)}
                </span>
                <time
                  dateTime={new Date(message.timestamp).toISOString()}
                  className="text-ink-muted"
                >
                  {timeFormat.format(message.timestamp)}
                </time>
              </span>
              <p className="text-base break-words whitespace-pre-wrap text-ink">
                {message.message}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex items-center gap-2 border-t border-line p-3"
      >
        <label htmlFor={inputId} className="sr-only">
          Mensagem
        </label>
        <Input
          ref={inputRef}
          id={inputId}
          autoComplete="off"
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Escreva para a sala"
          onKeyDown={(event) => {
            if (event.key === "Escape") chat.setOpen(false);
          }}
          className="h-11 rounded-full px-4 text-base"
        />
        <Button
          type="submit"
          size="icon"
          disabled={chat.isSending}
          aria-label="Enviar mensagem"
          className="size-11 shrink-0 rounded-full"
        >
          <Send aria-hidden="true" />
        </Button>
      </form>
    </aside>
  );
}
