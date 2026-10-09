import { z } from "zod";
import { CHAT_MAX_LENGTH } from "./data-channel";

/**
 * Editing and deleting chat messages. LiveKit chat only sends; the change goes
 * as a separate notice ("message X changed") and each screen applies it to its own copy.
 * Nothing is stored: whoever joins later sees no history.
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

interface ChatEditEntry {
  text?: string;
  deleted: boolean;
}

/**
 * Received changes, keyed by "sender:message". Keying by the
 * sender (identity given by the LiveKit server) is what prevents someone
 * from tampering with another person's message: when displaying, only the change
 * recorded with the identity of the message's author counts.
 */
export type ChatEdits = ReadonlyMap<string, ChatEditEntry>;

function editKey(sender: string, id: string): string {
  return `${sender}:${id}`;
}

/** Records the change. Deleting is final: later edits are ignored. */
export function recordChatEdit(edits: ChatEdits, edit: ChatEditOp, sender: string): ChatEdits {
  const key = editKey(sender, edit.id);
  if (edits.get(key)?.deleted) return edits;
  const next = new Map(edits);
  next.set(key, edit.type === "delete" ? { deleted: true } : { text: edit.text, deleted: false });
  return next;
}

export interface ResolvedChatText {
  text: string;
  edited: boolean;
  deleted: boolean;
}

/** The text shown on screen, with the changes made by its author. */
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
