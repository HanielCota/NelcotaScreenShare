import {
  useChat,
  useDataChannel,
  useLocalParticipant,
  type ReceivedChatMessage,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { participantName } from "@/features/room/domain/participant-label";
import {
  CHAT_EDIT_TOPIC,
  chatEditSchema,
  recordChatEdit,
  resolveChatText,
  type ChatEditOp,
  type ChatEdits,
} from "@/features/room/domain/chat-edits";
import {
  createReceiveThrottle,
  decodeMessage,
  encodeMessage,
} from "@/features/room/domain/data-channel";

/** Mensagem como aparece na tela: já com edições e exclusões aplicadas. */
export interface ChatEntry {
  id: string;
  from: Participant | undefined;
  mine: boolean;
  timestamp: number;
  text: string;
  edited: boolean;
  deleted: boolean;
}

export interface ChatState {
  messages: ChatEntry[];
  send: (text: string) => Promise<unknown>;
  /** Só a própria mensagem: os outros aplicam pela identidade de quem enviou. */
  edit: (id: string, text: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isSending: boolean;
  open: boolean;
  unread: number;
  setOpen: (open: boolean) => void;
}

export function chatAuthor(from: Participant | undefined): string {
  if (from?.isLocal) return "Você";
  return participantName(from);
}

/** Aviso de mensagem nova: some se a mensagem for editada ou apagada. */
function chatToastId(id: string): string {
  return `chat-${id}`;
}

/**
 * Estado do chat no nível da sala: as mensagens chegam mesmo com o painel
 * fechado (contador de não lidas e aviso). Atalho: C.
 */
export function useChatState(): ChatState {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [open, setOpenState] = useState(false);
  // Mensagens já vistas: ao abrir ou fechar o painel, tudo até ali conta como lido.
  const [seen, setSeen] = useState(0);
  const announced = useRef(0);
  const [edits, setEdits] = useState<ChatEdits>(() => new Map());
  const [acceptEdit] = useState(() => createReceiveThrottle(50));

  const { send: publishEdit } = useDataChannel(CHAT_EDIT_TOPIC, (message) => {
    const sender = message.from?.identity;
    if (!sender || !acceptEdit(sender)) return;
    const op = decodeMessage(message.payload, chatEditSchema);
    if (!op) return;
    setEdits((current) => recordChatEdit(current, op, sender));
    toast.dismiss(chatToastId(op.id));
  });

  async function change(op: ChatEditOp) {
    await publishEdit(encodeMessage(op), { reliable: true });
    // O canal não devolve o aviso para quem enviou: aplica aqui também.
    setEdits((current) => recordChatEdit(current, op, localParticipant.identity));
  }

  function setOpen(next: boolean) {
    setSeen(chatMessages.length);
    setOpenState(next);
  }

  const messages = chatMessages.map((message: ReceivedChatMessage): ChatEntry => {
    const resolved = resolveChatText(edits, {
      id: message.id,
      text: message.message,
      author: message.from?.identity,
    });
    return {
      id: message.id,
      from: message.from,
      mine: message.from?.isLocal ?? false,
      timestamp: message.timestamp,
      ...resolved,
    };
  });

  // Painel fechado: avisa a mensagem nova de outra pessoa.
  useEffect(() => {
    const fresh = chatMessages.slice(announced.current);
    announced.current = chatMessages.length;
    if (open) return;
    const last = fresh.findLast((message) => !message.from?.isLocal);
    if (last) {
      toast(`${chatAuthor(last.from)}: ${last.message}`, {
        id: chatToastId(last.id),
        action: { label: "Abrir", onClick: () => setOpenState(true) },
      });
    }
  }, [open, chatMessages]);

  useShortcut("c", () => setOpen(!open));

  const unread = open
    ? 0
    : messages.slice(seen).filter((message) => !message.mine && !message.deleted).length;

  return {
    messages,
    send,
    edit: (id, text) => change({ type: "edit", id, text }),
    remove: (id) => change({ type: "delete", id }),
    isSending,
    open,
    unread,
    setOpen,
  };
}
