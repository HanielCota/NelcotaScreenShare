import { ArrowDown, EyeOff, MessagesSquare, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { gsap, MOTION_DURATION, useGSAP } from "@/lib/animation/gsap";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { chatGroupStarts } from "@/features/room/domain/chat-format";
import type { ChatEntry, ChatState } from "@/features/room/hooks/use-chat-state";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { logBrowserWarning, reportBrowserError } from "@/lib/telemetry.client";

async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada");
  } catch (error) {
    logBrowserWarning("Could not copy the message", error);
    toast.error("Não foi possível copiar a mensagem.");
  }
}

export function ChatPanel({ chat }: { chat: ChatState }) {
  const reducedMotion = useReducedMotion();
  const scope = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  // Scrolled up to read: new messages do not pull the list down.
  const [atBottom, setAtBottom] = useState(true);
  const [missed, setMissed] = useState(0);

  useGSAP(
    () => {
      const panel = scope.current;
      if (!panel) return;
      gsap.set(panel, { x: 16, autoAlpha: 0 });
    },
    { scope },
  );

  useGSAP(
    () => {
      const panel = scope.current;
      if (!panel) return;
      gsap.to(panel, {
        x: reducedMotion || chat.open ? 0 : 16,
        autoAlpha: chat.open ? 1 : 0,
        duration: reducedMotion ? 0 : MOTION_DURATION.surface,
        overwrite: "auto",
      });
    },
    { scope, dependencies: [chat.open, reducedMotion] },
  );

  useEffect(() => {
    if (!chat.open) return;
    inputRef.current?.focus();
    // Focus and the panel's first layout can change its scrollable height.
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      list?.scrollTo({ top: list.scrollHeight });
    });
    return () => cancelAnimationFrame(frame);
  }, [chat.open]);

  function scrollToEnd(behavior: ScrollBehavior = "auto") {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior });
    setMissed(0);
  }

  // New message: follows along if the person is at the bottom (or if they sent it).
  const count = chat.messages.length;
  const seenCount = useRef(count);
  const onArrival = useEffectEvent((added: number) => {
    if (atBottom || chat.messages.at(-1)?.mine) {
      scrollToEnd();
      return;
    }
    setMissed((value) => value + added);
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
    // After React applies the text: caret at the end, ready to continue.
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
        return;
      }
      await chat.send(text);
      setDraft("");
      inputRef.current?.focus();
    } catch (error) {
      reportBrowserError(error);
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
    } catch (error) {
      reportBrowserError(error);
      toast.error("Não foi possível apagar a mensagem. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      ref={scope}
      aria-hidden={!chat.open}
      inert={!chat.open}
      aria-label="Chat da sala"
      // Wide screen: a column as tall as the room, aligned with the top of the bar and the bottom of the dock.
      className="glass invisible fixed top-20 right-3 bottom-32 z-40 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl group-data-capture-bar/room:max-lg:bottom-42 sm:right-6 lg:top-4 lg:bottom-4"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line py-3 pr-2 pl-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[-0.025em]">Chat da sala</h2>
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
                groupStart={starts[index] ?? true}
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
              onClick={() => scrollToEnd(reducedMotion ? "auto" : "smooth")}
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
          // Up arrow with an empty field: edits your last message.
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
