import {
  ConnectionError,
  ConnectionErrorReason,
  DisconnectReason,
  MediaDeviceFailure,
} from "livekit-client";
import type { LeaveReason } from "@/features/room/domain/leave";

/** Erros do LiveKit (conexão, queda, microfone) em mensagens para a pessoa. */

/** Falha ao abrir a conexão com a sala. */
export function connectErrorMessage(error: unknown): string {
  if (error instanceof ConnectionError) {
    // O LiveKit não tem um reason próprio para sala cheia: só a mensagem diz.
    // Acontece quando duas pessoas passam pela checagem do /api/token juntas.
    if (/full/i.test(error.message))
      return "A sala está cheia. Aguarde alguém sair e tente de novo.";
    switch (error.reason) {
      case ConnectionErrorReason.NotAllowed:
        return "Não foi possível autorizar sua entrada. Toque em Tentar de novo para renovar o acesso.";
      case ConnectionErrorReason.ServerUnreachable:
      case ConnectionErrorReason.WebSocket:
        return "Não foi possível conectar à sala. Verifique sua internet e tente de novo.";
      case ConnectionErrorReason.Timeout:
        return "A conexão demorou mais que o esperado. Tente de novo; se continuar, tente usar outra rede.";
      default:
        break;
    }
  }
  return "Não foi possível conectar à sala. Aguarde alguns segundos e tente de novo.";
}

/** Queda da conexão já aberta (`undefined`: sem mensagem específica). */
export function disconnectMessage(reason: DisconnectReason | undefined): string | undefined {
  switch (reason) {
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "Você entrou nesta sala em outra aba ou dispositivo, então esta conexão foi encerrada.";
    case DisconnectReason.PARTICIPANT_REMOVED:
      return "Você foi removido da sala. Fale com quem enviou o convite antes de entrar de novo.";
    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
      return "A sala foi encerrada. Volte ao início para criar uma nova sala.";
    case DisconnectReason.SERVER_SHUTDOWN:
      return "A sala ficou indisponível por um instante. Aguarde alguns segundos e entre de novo.";
    case DisconnectReason.JOIN_FAILURE:
    case DisconnectReason.SIGNAL_CLOSE:
    case DisconnectReason.CONNECTION_TIMEOUT:
      return "A conexão caiu. Verifique sua internet e toque em Voltar para a sala.";
    default:
      return undefined;
  }
}

/** Queda da conexão já aberta, no motivo que a tela de saída entende. */
export function disconnectReason(reason: DisconnectReason | undefined): LeaveReason {
  switch (reason) {
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "elsewhere";
    case DisconnectReason.PARTICIPANT_REMOVED:
      return "removed";
    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
      return "ended";
    default:
      return "dropped";
  }
}

/** Microfone que não abriu na pré-entrada. */
export function micErrorMessage(error: unknown): string {
  switch (MediaDeviceFailure.getFailure(error)) {
    case MediaDeviceFailure.PermissionDenied:
      return "O navegador bloqueou o microfone.";
    case MediaDeviceFailure.NotFound:
      return "Nenhum microfone encontrado. Conecte um microfone ou fone com microfone.";
    case MediaDeviceFailure.DeviceInUse:
      return "O microfone está em uso por outro programa (outra chamada, por exemplo). Feche esse programa e tente de novo.";
    default:
      return "Não deu para usar o microfone. Confira se ele está conectado e tente de novo.";
  }
}
