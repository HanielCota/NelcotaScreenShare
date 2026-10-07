import { useMediaDeviceSelect, useRoomContext } from "@livekit/components-react";
import { Check, ChevronUp } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { saveMicrophone } from "@/features/room/client/saved-microphone";
import { microphoneOptions } from "@/features/room/domain/microphone-options";
import {
  DeviceBadges,
  DeviceIcon,
  selectedMicrophoneIndex,
} from "@/features/room/ui/MicrophoneDevice";
import { cn } from "@/lib/utils";
import { DockButton } from "./DockButton";
import { DockPopoverContent, DockPopoverTitle } from "./DockPopover";

/**
 * Escolha do microfone dentro da sala, com a mesma lista da pré-entrada (um
 * item por aparelho, etiquetas de padrão). Só aparece com mais de um aparelho.
 */
export function MicMenu({ disabled = false }: { disabled?: boolean }) {
  const room = useRoomContext();
  const [open, setOpen] = useState(false);
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: "audioinput",
    room,
  });
  // Sem a entrada "default" (Firefox, Safari), a opção genérica não teria para onde apontar.
  const hasDefault = devices.some((device) => device.deviceId === "default");
  const options = microphoneOptions(devices).filter(
    (option) => option.kind !== "system" || hasDefault,
  );

  if (options.length < 2) return null;
  const selectedIndex = selectedMicrophoneIndex(options, activeDeviceId);

  async function choose(value: string) {
    setOpen(false);
    try {
      // "" segue o padrão do sistema: no LiveKit é o aparelho "default".
      await setActiveMediaDevice(value || "default");
      saveMicrophone(value || undefined);
    } catch {
      toast.error("Não foi possível trocar o microfone. Confira se ele está conectado.");
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <DockButton
          label="Escolher microfone"
          pressed={open}
          disabled={disabled}
          tone={open ? "active" : "default"}
          iconClassName="w-7 rounded-l-none rounded-r-xl border-0 border-l border-line-strong sm:w-8"
        >
          <ChevronUp
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
            aria-hidden="true"
          />
        </DockButton>
      </Popover.Trigger>
      <DockPopoverContent
        align="start"
        aria-label="Microfones"
        className="w-[min(22rem,calc(100vw-2rem))]"
      >
        <DockPopoverTitle>Microfone</DockPopoverTitle>
        <ul className="flex flex-col gap-0.5">
          {options.map((option, index) => {
            const active = index === selectedIndex;
            return (
              <li key={option.value || "default"}>
                <button
                  type="button"
                  autoFocus={active}
                  aria-current={active || undefined}
                  onClick={() => void choose(option.value)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none active:bg-surface-3/70"
                >
                  <DeviceIcon kind={option.kind} />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={cn("truncate", active ? "font-semibold" : "text-ink")}>
                      {option.label}
                    </span>
                    <DeviceBadges option={option} />
                  </span>
                  <Check
                    className={cn("size-4 shrink-0 text-brand-soft", !active && "invisible")}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </DockPopoverContent>
    </Popover.Root>
  );
}
