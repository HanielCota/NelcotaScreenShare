import { z } from "zod";
import { CHAT_MAX_LENGTH } from "./data-channel";

/**
 * Editar e apagar mensagens do chat. O chat do LiveKit só envia; a mudança vai
 * como um aviso à parte ("a mensagem X mudou") e cada tela aplica na sua cópia.
 * Nada é salvo: quem entra depois não vê histórico.
 */
export const CHAT_EDIT_TOPIC = "nelcota.chat-edit";

const messageId = z.string().min(1).max(128);

export const chatEditSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("edit"),
    id: messageId,
    text: z.string().trim().min(1).max(CHAT_MAX_LENGTH),
  }),
  z.object({ type: z.literal("delete"), id: messageId }),
]);
export type ChatEditOp = z.infer<typeof chatEditSchema>;

export interface ChatEditEntry {
  text?: string;
  deleted: boolean;
}

/**
 * Mudanças recebidas, indexadas por "remetente:mensagem". Guardar pelo
 * remetente (identidade dada pelo servidor do LiveKit) é o que impede alguém
 * de mexer na mensagem de outra pessoa: na hora de mostrar, só vale a mudança
 * gravada com a identidade de quem escreveu a mensagem.
 */
export type ChatEdits = ReadonlyMap<string, ChatEditEntry>;

function editKey(sender: string, id: string): string {
  return `${sender}:${id}`;
}

/** Registra a mudança. Apagar é definitivo: edições depois disso são ignoradas. */
export function recordChatEdit(edits: ChatEdits, op: ChatEditOp, sender: string): ChatEdits {
  const key = editKey(sender, op.id);
  if (edits.get(key)?.deleted) return edits;
  const next = new Map(edits);
  next.set(key, op.type === "delete" ? { deleted: true } : { text: op.text, deleted: false });
  return next;
}

export interface ResolvedChatText {
  text: string;
  edited: boolean;
  deleted: boolean;
}

/** O texto que aparece na tela, com as mudanças feitas por quem escreveu. */
export function resolveChatText(
  edits: ChatEdits,
  message: { id: string; text: string; author: string | undefined },
): ResolvedChatText {
  const entry = message.author ? edits.get(editKey(message.author, message.id)) : undefined;
  if (entry?.deleted) return { text: "", edited: false, deleted: true };
  if (entry?.text !== undefined && entry.text !== message.text) {
    return { text: entry.text, edited: true, deleted: false };
  }
  return { text: message.text, edited: false, deleted: false };
}
