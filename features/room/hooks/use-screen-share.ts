import { useLocalParticipant } from "@livekit/components-react";
import { ScreenSharePresets, Track } from "livekit-client";
import { useState } from "react";
import { toast } from "sonner";
import { showsCaptureBar, type ShareChoice } from "@/features/room/domain/share-support";
import { useShareSupport } from "@/features/room/hooks/use-share-support";

/**
 * Starting and stopping screen sharing. One instance per room
 * (RoomLayout), passed to the dock and to the "Compartilhar minha tela" shown when
 * alone: that way there is a single `busy` and two pickers cannot be opened.
 */
export function useScreenShare() {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState(false);
  // Sound preference shared by the dock menu and the alone screen.
  const [audioPreferred, setAudioPreferred] = useState(true);
  const support = useShareSupport();
  const sharedSurface = isScreenShareEnabled
    ? localParticipant
        .getTrackPublication(Track.Source.ScreenShare)
        ?.track?.mediaStreamTrack.getSettings().displaySurface
    : undefined;

  async function start({ surface, audio }: ShareChoice) {
    // Text (screen, window): 15fps leaves bandwidth for every frame to come out sharp.
    // A tab is usually video or animated slides: 30fps.
    const preset =
      surface === "browser" ? ScreenSharePresets.h1080fps30 : ScreenSharePresets.h1080fps15;
    setBusy(true);
    try {
      await localParticipant.setScreenShareEnabled(
        true,
        {
          // Opens the browser picker directly on the tab chosen in our menu.
          video: { displaySurface: surface },
          audio: audio
            ? {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                // System audio also carries the room's own playback: without this,
                // everyone would hear their voice coming back (Chromium only).
                restrictOwnAudio: true,
              }
            : false,
          systemAudio: audio ? "include" : "exclude",
          selfBrowserSurface: "exclude",
          surfaceSwitching: "include",
          contentHint: surface === "browser" ? "motion" : "detail",
          resolution: preset.resolution,
        },
        { screenShareEncoding: preset.encoding },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.info(
          "O compartilhamento foi cancelado ou bloqueado. Tente de novo e confirme a tela no navegador.",
        );
        return;
      }
      if (error instanceof DOMException && error.name === "NotSupportedError") {
        toast.error(
          "Este navegador não consegue compartilhar a tela. Tente pelo Chrome, Edge ou Firefox no computador.",
        );
        return;
      }
      toast.error(
        "Não foi possível compartilhar a tela. Tente de novo e confirme a tela no seletor do navegador.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await localParticipant.setScreenShareEnabled(false);
    } catch {
      toast.error(
        "Não foi possível parar o compartilhamento. Tente novamente ou use o botão Parar compartilhamento do navegador.",
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    isSharing: isScreenShareEnabled,
    /** The browser's own sharing bar covers the bottom of the page. */
    captureBar: support !== null && showsCaptureBar(support, sharedSurface),
    busy,
    audio: audioPreferred,
    setAudio: setAudioPreferred,
    start,
    stop,
  };
}

export type ScreenShareControl = ReturnType<typeof useScreenShare>;
