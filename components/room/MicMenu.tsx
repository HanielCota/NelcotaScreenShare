"use client";

import { useMediaDeviceSelect, useRoomContext } from "@livekit/components-react";
import { Check, ChevronUp } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { saveMicrophone } from "@/lib/room-data";
import { cn } from "@/lib/utils";
import { DockButton } from "./DockButton";

/** Escolha do microfone dentro da sala. Só aparece com mais de um dispositivo. */
export function MicMenu() {
  const room = useRoomContext();
  const [open, setOpen] = useState(false);
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: "audioinput",
    room,
  });

  if (devices.length < 2) return null;

  async function choose(deviceId: string) {
    setOpen(false);
    try {
      await setActiveMediaDevice(deviceId);
      saveMicrophone(deviceId);
    } catch {
      toast.error("Não foi possível trocar o microfone. Confira se ele está conectado.");
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <DockButton label="Escolher microfone" pressed={open} className="w-8! max-sm:hidden">
          <ChevronUp className="size-4" aria-hidden="true" />
        </DockButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={14}
          collisionPadding={16}
          aria-label="Microfones"
          className="glass z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-2 outline-none"
        >
          <p className="px-3 pt-2 pb-2.5 text-sm font-semibold tracking-tight">Microfone</p>
          <ul className="flex flex-col gap-1">
            {devices.map((device, index) => {
              const active = device.deviceId === activeDeviceId;
              return (
                <li key={device.deviceId}>
                  <button
                    type="button"
                    autoFocus={active}
                    aria-current={active || undefined}
                    onClick={() => void choose(device.deviceId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-surface-3 focus-visible:bg-surface-3",
                      active ? "font-semibold text-ink" : "text-ink-muted",
                    )}
                  >
                    <Check
                      className={cn("size-4 shrink-0 text-brand-soft", !active && "invisible")}
                      aria-hidden="true"
                    />
                    <span className="truncate">{device.label || `Microfone ${index + 1}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
