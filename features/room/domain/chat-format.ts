/** Consecutive messages from the same person, up to 2 minutes apart, form a group. */
export const CHAT_GROUP_GAP_MS = 2 * 60 * 1000;

interface ChatItem {
  /** Who sent it (identity); `undefined` when the sender is unknown. */
  author: string | undefined;
  timestamp: number;
}

/** For each message: does it start a new group (shows name and time)? */
export function chatGroupStarts(items: readonly ChatItem[]): boolean[] {
  return items.map((item, index) => {
    const previous = items[index - 1];
    return (
      !previous ||
      previous.author !== item.author ||
      item.timestamp - previous.timestamp > CHAT_GROUP_GAP_MS
    );
  });
}

export type ChatPart = { type: "text"; value: string } | { type: "link"; value: string };

const LINK = /https?:\/\/[^\s<>"]+/g;
/** Punctuation stuck to the end of a link usually belongs to the sentence, not the address. */
const TRAILING = /[.,;:!?)\]]+$/;

/** Splits the text into chunks and http(s) links, so the chat shows clickable links. */
export function chatParts(text: string): ChatPart[] {
  const parts: ChatPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const url = match[0].replace(TRAILING, "");
    const start = match.index;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    parts.push({ type: "link", value: url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
