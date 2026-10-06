/**
 * O que o navegador de quem está vendo consegue fazer na sala. A tela é
 * detectada pelo recurso (getDisplayMedia); o áudio do computador não dá
 * para checar antes, então vem do motor do navegador.
 */
export type ShareSupport =
  /** Chrome, Edge e outros Chromium no computador: tela e áudio. */
  | "full"
  /** Firefox no computador: tela, sem o áudio do computador. */
  | "screen-only"
  /** Safari no Mac: tela, sem áudio. */
  | "safari"
  /** Celular ou tablet: assiste e conversa, não compartilha. */
  | "mobile"
  /** Computador com navegador antigo ou sem o recurso. */
  | "unsupported";

export interface BrowserTraits {
  userAgent: string;
  hasDisplayMedia: boolean;
  /** navigator.userAgentData.mobile, quando o navegador informa. */
  mobileHint?: boolean | undefined;
  /** iPad se apresenta como Mac; o toque denuncia. */
  maxTouchPoints?: number;
}

export function classifyShareSupport({
  userAgent,
  hasDisplayMedia,
  mobileHint,
  maxTouchPoints = 0,
}: BrowserTraits): ShareSupport {
  const ipadAsMac = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  const mobile = mobileHint ?? (/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || ipadAsMac);
  if (mobile) return "mobile";
  if (!hasDisplayMedia) return "unsupported";
  if (/Firefox\//.test(userAgent)) return "screen-only";
  // Safari tem "Safari/" mas não "Chrome/" (Chromium inclui os dois).
  if (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\//.test(userAgent)) return "safari";
  return "full";
}

/** Lê os traços do navegador atual (só no cliente). */
export function currentShareSupport(): ShareSupport {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return classifyShareSupport({
    userAgent: nav.userAgent,
    hasDisplayMedia: canShareScreen(),
    mobileHint: nav.userAgentData?.mobile,
    maxTouchPoints: nav.maxTouchPoints,
  });
}

/** O navegador abre o seletor de tela? (mesma checagem da sala) */
export function canShareScreen(): boolean {
  return "getDisplayMedia" in (navigator.mediaDevices ?? {});
}

export const SHARE_SUPPORT_TEXT: Record<
  ShareSupport,
  { tone: "ok" | "warn" | "info"; title: string; detail?: string }
> = {
  full: { tone: "ok", title: "Seu navegador compartilha tela e áudio." },
  "screen-only": {
    tone: "ok",
    title: "Seu navegador compartilha a tela.",
    detail: "O áudio do computador não vai junto: para isso, use o Chrome ou o Edge.",
  },
  safari: {
    tone: "warn",
    title: "No Safari, a tela vai sem o áudio.",
    detail: "Para compartilhar com som, use o Chrome ou o Edge.",
  },
  mobile: {
    tone: "info",
    title: "No celular você assiste e conversa.",
    detail: "Para compartilhar a tela, entre pelo computador.",
  },
  unsupported: {
    tone: "warn",
    title: "Este navegador não compartilha a tela.",
    detail: "Use o Chrome, o Edge ou o Firefox atualizados.",
  },
};
