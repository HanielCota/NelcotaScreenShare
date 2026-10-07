import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { roomPath } from "@/features/room/domain/room-code";
import { cn } from "@/lib/utils";

/** Copia o convite; sem acesso à área de transferência, mostra o link para copiar à mão. */
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
      <p className="w-full text-center text-sm text-ink-muted">
        Copie e mande para o time:{" "}
        <span className="font-sans font-medium break-all text-ink tabular-nums select-all">
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
        "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
        copied ? "bg-success/10 text-success" : "text-brand-soft hover:bg-surface-2",
      )}
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Link2 className="size-4" aria-hidden="true" />
      )}
      {copied ? "Link copiado" : "Copiar convite"}
    </button>
  );
}
