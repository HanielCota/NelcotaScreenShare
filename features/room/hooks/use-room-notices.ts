import { useRoomContext } from "@livekit/components-react";
import {
  ConnectionState,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { useEffect } from "react";
import { toast } from "sonner";
import { participantName } from "@/features/room/domain/participant-label";

/**
 * Short notices of what happens in the room: who joined, who left and who
 * started or stopped showing their screen. They disappear on their own and need no click.
 */
export function useRoomNotices() {
  const room = useRoomContext();

  useEffect(() => {
    const joined = (participant: RemoteParticipant) =>
      toast(`${participantName(participant)} entrou na sala`, { duration: 3000 });
    const left = (participant: RemoteParticipant) =>
      toast(`${participantName(participant)} saiu da sala`, { duration: 3000 });
    const published = (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (publication.source !== Track.Source.ScreenShare) return;
      toast(`${participantName(participant)} começou a mostrar a tela`, { duration: 3000 });
    };
    const unpublished = (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (publication.source !== Track.Source.ScreenShare) return;
      // Someone leaving (or us disconnecting) also unpublishes: "saiu da sala" is enough.
      if (room.state !== ConnectionState.Connected) return;
      if (!room.remoteParticipants.has(participant.identity)) return;
      toast(`${participantName(participant)} parou de mostrar a tela`, { duration: 3000 });
    };

    room
      .on(RoomEvent.ParticipantConnected, joined)
      .on(RoomEvent.ParticipantDisconnected, left)
      .on(RoomEvent.TrackPublished, published)
      .on(RoomEvent.TrackUnpublished, unpublished);
    return () => {
      room
        .off(RoomEvent.ParticipantConnected, joined)
        .off(RoomEvent.ParticipantDisconnected, left)
        .off(RoomEvent.TrackPublished, published)
        .off(RoomEvent.TrackUnpublished, unpublished);
    };
  }, [room]);
}
