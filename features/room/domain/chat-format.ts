/** Mensagens seguidas da mesma pessoa, com até 2 minutos entre elas, viram um grupo. */
export const CHAT_GROUP_GAP_MS = 2 * 60 * 1000;

interface ChatItem {
  /** Quem enviou (identity); `undefined` quando o remetente é desconhecido. */
  author: string | undefined;
  timestamp: number;
}

/** Para cada mensagem: ela abre um grupo novo (mostra nome e hora)? */
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
/** Pontuação colada no fim do link costuma ser da frase, não do endereço. */
const TRAILING = /[.,;:!?)\]]+$/;

/** Separa o texto em trechos e links http(s), para o chat mostrar links clicáveis. */
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
