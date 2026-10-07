import { useLocalParticipant } from "@livekit/components-react";
import { ScreenSharePresets } from "livekit-client";
import { useState } from "react";
import { toast } from "sonner";
import type { ShareChoice } from "@/features/room/domain/share-support";

/**
 * Começar e parar o compartilhamento de tela. Uma instância por sala
 * (RoomLayout), repassada à dock e ao "Compartilhar minha tela" de quem está
 * sozinho: assim o `busy` é um só e não dá para abrir dois seletores.
 */
export function useScreenShare() {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState(false);

  async function start({ surface, audio }: ShareChoice) {
    // Texto (tela, janela): 15fps sobra banda para cada quadro sair nítido.
    // Aba costuma ser vídeo ou slides animados: 30fps.
    const preset =
      surface === "browser" ? ScreenSharePresets.h1080fps30 : ScreenSharePresets.h1080fps15;
    setBusy(true);
    try {
      await localParticipant.setScreenShareEnabled(
        true,
        {
          // Abre o seletor do navegador direto na aba escolhida no nosso menu.
          video: { displaySurface: surface },
          audio: audio
            ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
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
      } else if (error instanceof DOMException && error.name === "NotSupportedError") {
        toast.error(
          "Este navegador não consegue compartilhar a tela. Tente pelo Chrome, Edge ou Firefox no computador.",
        );
      } else {
        toast.error(
          "Não foi possível compartilhar a tela. Tente de novo e confirme a tela no seletor do navegador.",
        );
      }
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

  return { isSharing: isScreenShareEnabled, busy, start, stop };
}

export type ScreenShareControl = ReturnType<typeof useScreenShare>;
