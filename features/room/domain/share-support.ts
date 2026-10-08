/**
 * What the viewer's browser can do in the room. Screen sharing is
 * detected by feature (getDisplayMedia); computer audio cannot be
 * checked in advance, so it comes from the browser engine.
 */
export type ShareSupport =
  /** Chrome, Edge and other Chromium browsers on desktop: screen and audio. */
  | "full"
  /** Firefox on desktop: screen, without computer audio. */
  | "screen-only"
  /** Safari on Mac: screen, no audio. */
  | "safari"
  /** Phone or tablet: watches and talks, does not share. */
  | "mobile"
  /** Desktop with an old browser or without the feature. */
  | "unsupported";

export interface BrowserTraits {
  userAgent: string;
  hasDisplayMedia: boolean;
  /** navigator.userAgentData.mobile, when the browser reports it. */
  mobileHint?: boolean | undefined;
  /** iPad presents itself as a Mac; touch gives it away. */
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
  // Safari has "Safari/" but not "Chrome/" (Chromium includes both).
  if (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\//.test(userAgent)) return "safari";
  return "full";
}

/** Reads the current browser's traits (client only). */
export function currentShareSupport(): ShareSupport {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return classifyShareSupport({
    userAgent: nav.userAgent,
    hasDisplayMedia: canShareScreen(),
    mobileHint: nav.userAgentData?.mobile,
    maxTouchPoints: nav.maxTouchPoints,
  });
}

/** Does the browser open the screen picker? */
function canShareScreen(): boolean {
  return "getDisplayMedia" in (navigator.mediaDevices ?? {});
}

/** Can the person start a screen share from this browser? */
export function canShare(support: ShareSupport): boolean {
  return support === "full" || support === "screen-only" || support === "safari";
}

/** Does the computer audio go along with the screen? Only Chromium on desktop. */
export function sharesAudio(support: ShareSupport): boolean {
  return support === "full";
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

/** What to share: the whole screen, a window or a tab (with or without sound). */
export type ShareSurface = "monitor" | "window" | "browser";

export interface ShareChoice {
  surface: ShareSurface;
  audio: boolean;
}
