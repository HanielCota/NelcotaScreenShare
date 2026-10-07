import { Check, Copy } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { roomPath } from "@/features/room/domain/room-code";

/**
 * Empty room invite: the link in plain sight (the person sees what they are copying), the
 * copy button and, on desktop, a QR code to join from a phone.
 */
export function InviteCard({ code }: { code: string }) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${roomPath(code)}`;
  const shown = `${window.location.host}${roomPath(code)}`;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard access: leaves the link selected to copy by hand.
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="apple-buttons flex w-full items-center gap-5 rounded-2xl border border-line bg-surface p-4 text-left sm:p-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 id={titleId} className="text-base font-medium">
            Convide o time
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Mande o link<span className="max-sm:hidden"> ou aponte a câmera do celular</span>.
          </p>
        </div>
        <div className="flex min-w-0 gap-2">
          <label htmlFor={`${titleId}-link`} className="sr-only">
            Link da sala
          </label>
          <input
            ref={inputRef}
            id={`${titleId}-link`}
            readOnly
            value={shown}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 min-w-0 flex-1 truncate rounded-xl border border-line bg-surface-2 px-3 font-sans text-sm text-ink tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void copy()}
            aria-live="polite"
            className="shrink-0"
          >
            {copied ? (
              <Check className="text-success" aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>
      <div className="shrink-0 max-sm:hidden">
        <QrCode value={url} label="QR code para entrar na sala pelo celular" size={104} />
      </div>
    </section>
  );
}
