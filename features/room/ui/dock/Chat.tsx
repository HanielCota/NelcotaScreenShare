import { ArrowDown, EyeOff, MessagesSquare, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";
import { chatGroupStarts } from "@/features/room/domain/chat-format";
import type { ChatEntry, ChatState } from "@/features/room/hooks/use-chat-state";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";

async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada");
  } catch {
    toast.error("Não foi possível copiar a mensagem.");
  }
}

export function ChatPanel({ chat }: { chat: ChatState }) {
  const scope = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  // Rolou para cima para ler: mensagens novas não puxam a lista para baixo.
  const [atBottom, setAtBottom] = useState(true);
  const [missed, setMissed] = useState(0);

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

  function scrollToEnd(behavior: ScrollBehavior = "auto") {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior });
    setMissed(0);
  }

  // Mensagem nova: acompanha se a pessoa está no fim (ou se foi ela que enviou).
  const count = chat.messages.length;
  const seenCount = useRef(count);
  const onArrival = useEffectEvent((added: number) => {
    if (atBottom || chat.messages.at(-1)?.mine) scrollToEnd();
    else setMissed((value) => value + added);
  });
  useEffect(() => {
    const added = count - seenCount.current;
    seenCount.current = count;
    if (added > 0) onArrival(added);
  }, [count]);

  const editing = chat.messages.find((message) => message.id === editingId && !message.deleted);
  const starts = chatGroupStarts(
    chat.messages.map((message) => ({
      author: message.from?.identity,
      timestamp: message.timestamp,
    })),
  );

  function focusInput() {
    // Depois do React aplicar o texto: cursor no fim, pronto para continuar.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function startEditing(entry: ChatEntry) {
    setEditingId(entry.id);
    setDraft(entry.text);
    focusInput();
  }

  function cancelEditing() {
    setEditingId(undefined);
    setDraft("");
    focusInput();
  }

  async function submit() {
    const text = draft.trim();
    if (!text || chat.isSending || busy) return;
    if (editing && text === editing.text) {
      cancelEditing();
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await chat.edit(editing.id, text);
        cancelEditing();
      } else {
        await chat.send(text);
        setDraft("");
        inputRef.current?.focus();
      }
    } catch {
      toast.error(
        editing
          ? "Não foi possível editar a mensagem. Tente de novo."
          : "Não foi possível enviar a mensagem. Tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const id = deletingId;
    if (!id) return;
    setBusy(true);
    try {
      await chat.remove(id);
      if (id === editingId) cancelEditing();
      setDeletingId(undefined);
    } catch {
      toast.error("Não foi possível apagar a mensagem. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      ref={scope}
      aria-label="Chat da sala"
      // Tela larga: coluna da altura da sala, alinhada com o topo da barra e a base do dock.
      className="glass fixed top-20 right-3 bottom-32 z-40 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl sm:right-6 lg:top-4 lg:bottom-4"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line py-3 pr-2 pl-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium tracking-tight">Chat da sala</h2>
          <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <EyeOff className="size-3.5 shrink-0" aria-hidden="true" />
            Nada fica salvo: some quando a sala acaba
          </p>
        </div>
        <button
          type="button"
          onClick={() => chat.setOpen(false)}
          aria-label="Fechar chat"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink focus-visible:bg-surface-3 focus-visible:outline-none active:scale-95"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      {count === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand/12 text-brand-soft">
            <MessagesSquare className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-medium">Nenhuma mensagem ainda</p>
            <p className="mt-1 text-sm text-ink-muted">
              Mande um link, um recado ou um oi para a sala.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <ol
            ref={listRef}
            aria-live="polite"
            onScroll={(event) => {
              const list = event.currentTarget;
              const bottom = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
              setAtBottom(bottom);
              if (bottom) setMissed(0);
            }}
            className="flex flex-1 flex-col overflow-y-auto px-3 py-4"
          >
            {chat.messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                groupStart={starts[index]!}
                editing={message.id === editingId}
                onEdit={() => startEditing(message)}
                onDelete={() => setDeletingId(message.id)}
                onCopy={() => void copyMessage(message.text)}
              />
            ))}
          </ol>
          {missed > 0 ? (
            <button
              type="button"
              onClick={() => scrollToEnd("smooth")}
              className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-brand-ink shadow-soft transition-colors hover:bg-brand-hover"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
              {missed === 1 ? "1 nova mensagem" : `${missed} novas mensagens`}
            </button>
          ) : null}
        </div>
      )}

      <ChatComposer
        inputRef={inputRef}
        draft={draft}
        onDraftChange={setDraft}
        editing={editing !== undefined}
        busy={busy || chat.isSending}
        onSubmit={() => void submit()}
        onCancelEdit={cancelEditing}
        onEditLast={() => {
          // Seta para cima com o campo vazio: edita a sua última mensagem.
          const last = chat.messages.findLast((message) => message.mine && !message.deleted);
          if (last) startEditing(last);
          return last !== undefined;
        }}
        onClose={() => chat.setOpen(false)}
      />

      <ConfirmDialog
        open={deletingId !== undefined}
        onOpenChange={(next) => {
          if (!next) setDeletingId(undefined);
        }}
        title="Apagar mensagem?"
        description="Ela some para todos na sala. Quem já leu pode ter visto."
        confirmLabel="Apagar"
        danger
        pending={busy}
        onConfirm={() => void confirmDelete()}
      />
    </aside>
  );
}
