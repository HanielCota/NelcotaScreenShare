"use client";

import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { roomPath } from "@/lib/livekit";
import { cn } from "@/lib/utils";

/**
 * "Copiar link para convidar": a confirmação aparece no próprio botão (o
 * aviso no topo da tela passava despercebido). Sem área de transferência,
 * o link aparece para copiar à mão.
 */
export function InviteLinkButton({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    const url = `${window.location.origin}${roomPath(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  if (state === "manual") {
    return (
      <p className="max-w-full text-center text-sm text-ink-muted">
        Copie e mande para o time:{" "}
        <span className="font-mono font-semibold break-all text-ink select-all">
          {`${window.location.origin}${roomPath(code)}`}
        </span>
      </p>
    );
  }

  const copied = state === "copied";
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-live="polite"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[transform,background-color,color,border-color] active:scale-95",
        copied
          ? "border-success/40 bg-success/10 text-success"
          : "border-line bg-surface-2 text-ink hover:bg-surface-3",
      )}
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Link2 className="size-4" aria-hidden="true" />
      )}
      {copied ? "Link copiado! Agora é só colar na conversa" : "Copiar link para convidar"}
    </button>
  );
}
