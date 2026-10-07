import { RoomAudioRenderer, RoomContext } from "@livekit/components-react";
import { useRoomConnection } from "@/features/room/hooks/use-room-connection";
import { ReactionsProvider } from "@/features/room/ui/dock/Reactions";
import type { JoinChoices } from "@/features/room/domain/join";
import type { LeaveNotice } from "@/features/room/domain/leave";
import { ConnectError } from "./ConnectError";
import { RoomLayout } from "./RoomLayout";

interface RoomViewProps {
  code: string;
  choices: JoinChoices;
  maxParticipants: number;
  onLeave: (notice?: LeaveNotice) => void;
  onRetry: () => Promise<void>;
}

/** Conecta à sala e mostra a chamada (ou a tela de falha, com "Tentar de novo"). */
export function RoomView({ code, choices, maxParticipants, onLeave, onRetry }: RoomViewProps) {
  const { room, connectError, leave } = useRoomConnection(choices, onLeave);

  if (connectError) {
    return (
      <ConnectError
        message={connectError}
        onRetry={onRetry}
        onBack={() =>
          onLeave({
            reason: "failed",
            message: "Não foi possível conectar. Tente entrar novamente.",
          })
        }
      />
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <ReactionsProvider>
        <RoomLayout code={code} maxParticipants={maxParticipants} onLeave={leave} />
      </ReactionsProvider>
      <RoomAudioRenderer />
    </RoomContext.Provider>
  );
}
