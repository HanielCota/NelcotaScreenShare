"use client";

import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { useEffect } from "react";
import { toast } from "sonner";
import { participantName } from "@/features/room/domain/participant-label";

/**
 * Avisos curtos do que acontece na sala: quem entrou, quem saiu e quem
 * começou a mostrar a tela. Somem sozinhos e não precisam de clique.
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

    room
      .on(RoomEvent.ParticipantConnected, joined)
      .on(RoomEvent.ParticipantDisconnected, left)
      .on(RoomEvent.TrackPublished, published);
    return () => {
      room
        .off(RoomEvent.ParticipantConnected, joined)
        .off(RoomEvent.ParticipantDisconnected, left)
        .off(RoomEvent.TrackPublished, published);
    };
  }, [room]);
}
