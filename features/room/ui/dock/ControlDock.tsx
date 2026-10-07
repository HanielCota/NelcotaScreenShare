import { useIsSpeaking, useLocalParticipant } from "@livekit/components-react";
import { MediaDeviceFailure } from "livekit-client";
import { MessageSquare, Mic, MicOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { cn } from "@/lib/utils";
import { canShareScreen } from "@/features/room/domain/share-support";
import type { ChatState } from "@/features/room/hooks/use-chat-state";
import { DockButton } from "./DockButton";
import { LeaveMenu } from "./LeaveMenu";
import { MicMenu } from "./MicMenu";
import { ReactionsMenu } from "./Reactions";
import { ShareMenu } from "./ShareMenu";
import { MIC_ERROR_TOAST } from "@/features/room/client/toast-ids";
import type { ScreenShareControl } from "@/features/room/hooks/use-screen-share";

interface ControlDockProps {
  chat: ChatState;
  share: ScreenShareControl;
  onLeave: () => void;
}

/**
 * Controls grouped by function: audio/screen, interaction and leave.
 * The device picker is part of the microphone control, on phones too.
 */
export function ControlDock({ chat, share, onLeave }: ControlDockProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [micBusy, setMicBusy] = useState(false);
  // Microphone sign of life: alone in the room, nobody confirms you are being heard.
  const speaking = useIsSpeaking(localParticipant) && isMicrophoneEnabled;
  const shareSupported = canShareScreen();

  async function toggleMic() {
    setMicBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      toast.error(
        MediaDeviceFailure.getFailure(error) === MediaDeviceFailure.PermissionDenied
          ? "Permissão do microfone negada. Libere o acesso nas configurações do navegador."
          : "Não foi possível alterar o microfone. Confira o dispositivo e tente novamente.",
        { id: MIC_ERROR_TOAST },
      );
    } finally {
      setMicBusy(false);
    }
  }

  useShortcut("m", () => void toggleMic(), !micBusy);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
        // Chat open on a wide screen: the dock centers in the remaining space, like the content.
        chat.open && "lg:pr-[26.5rem]",
      )}
    >
      <nav
        data-anim="dock"
        aria-label="Controles da chamada"
        className="glass pointer-events-auto flex items-start gap-0.5 rounded-3xl border-line-strong bg-surface/90 p-2 sm:gap-2 sm:p-3"
      >
        <fieldset aria-label="Áudio e compartilhamento" className="flex items-start gap-1 sm:gap-2">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex rounded-xl ring-1 transition-[background-color,box-shadow] duration-200 ring-inset",
                !isMicrophoneEnabled
                  ? "bg-danger/10 ring-danger/25"
                  : speaking
                    ? "bg-brand/12 shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-brand)_45%,transparent)] ring-brand"
                    : "bg-surface-2 ring-line-strong",
              )}
            >
              <DockButton
                label={isMicrophoneEnabled ? "Desligar microfone" : "Ligar microfone"}
                tone={isMicrophoneEnabled ? "default" : "muted"}
                pressed={!isMicrophoneEnabled}
                shortcut="M"
                disabled={micBusy}
                busy={micBusy}
                iconClassName="rounded-xl border-0 bg-transparent sm:w-13"
                onClick={() => void toggleMic()}
              >
                {isMicrophoneEnabled ? (
                  <Mic className="size-5" aria-hidden="true" />
                ) : (
                  <MicOff className="size-5" aria-hidden="true" />
                )}
              </DockButton>
              <MicMenu disabled={micBusy} />
            </div>
            <span
              aria-hidden="true"
              className={cn(
                "text-xs leading-4 font-medium whitespace-nowrap sm:text-[0.8125rem]",
                isMicrophoneEnabled ? "text-ink/85" : "text-danger",
              )}
            >
              {isMicrophoneEnabled ? (
                <>
                  <span className="sm:hidden">Mic</span>
                  <span className="max-sm:hidden">Microfone</span>
                </>
              ) : (
                "Mudo"
              )}
            </span>
          </div>

          <ShareMenu
            isSharing={share.isSharing}
            supported={shareSupported}
            busy={share.busy}
            onShare={(choice) => void share.start(choice)}
            onStop={() => void share.stop()}
          />
        </fieldset>

        <Separator
          orientation="vertical"
          className="mx-0.5 mt-1.5 h-8 w-px bg-line-strong sm:mx-1 sm:mt-2 data-vertical:self-start"
        />

        <fieldset aria-label="Interação" className="flex items-start gap-1 sm:gap-2">
          <ReactionsMenu />

          <DockButton
            label={
              chat.unread > 0
                ? `Chat (${chat.unread} ${chat.unread === 1 ? "nova" : "novas"})`
                : "Chat"
            }
            tone={chat.open ? "active" : "default"}
            caption="Chat"
            pressed={chat.open}
            shortcut="C"
            onClick={() => chat.setOpen(!chat.open)}
          >
            <MessageSquare className="size-5" aria-hidden="true" />
            {chat.unread > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-medium text-brand-ink ring-2 ring-surface"
              >
                {chat.unread > 9 ? "9+" : chat.unread}
              </span>
            ) : null}
          </DockButton>
        </fieldset>

        <Separator
          orientation="vertical"
          className="mx-0.5 mt-1.5 h-8 w-px bg-line-strong sm:mx-1 sm:mt-2 data-vertical:self-start"
        />

        <LeaveMenu onLeave={onLeave} />
      </nav>
    </div>
  );
}
