import { PhoneOff } from "lucide-react";
import { Popover } from "radix-ui";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { DockButton } from "./DockButton";
import { DockPopoverContent } from "./DockPopover";

/**
 * Sair pede confirmação: um clique sem querer não derruba a chamada.
 * Atalho E abre a confirmação; Enter confirma e Esc cancela.
 */
export function LeaveMenu({ onLeave }: { onLeave: () => void }) {
  const [open, setOpen] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useShortcut("e", () => setOpen(true), !open);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <DockButton
          label="Sair da sala"
          tone="danger"
          caption="Sair"
          pressed={open}
          shortcut="E"
          aria-haspopup="dialog"
        >
          <PhoneOff className="size-5" aria-hidden="true" />
        </DockButton>
      </Popover.Trigger>
      <DockPopoverContent
        align="end"
        role="alertdialog"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          confirmRef.current?.focus();
        }}
        aria-label="Sair da sala?"
        className="w-[min(18rem,calc(100vw-2rem))] p-4"
      >
        <p className="text-sm font-medium tracking-tight">Sair da sala?</p>
        <p className="mt-1 text-xs text-ink-subtle">
          Seu microfone e o compartilhamento de tela serão encerrados.
        </p>
        <div className="apple-buttons mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            ref={confirmRef}
            className="bg-danger text-canvas hover:bg-danger/90"
            onClick={() => {
              setOpen(false);
              onLeave();
            }}
          >
            Sair
          </Button>
        </div>
      </DockPopoverContent>
    </Popover.Root>
  );
}
