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

function displayName(participant: RemoteParticipant): string {
  return participant.name || participant.identity;
}

/**
 * Avisos curtos do que acontece na sala: quem entrou, quem saiu e quem
 * começou a mostrar a tela. Somem sozinhos e não precisam de clique.
 */
export function useRoomNotices() {
  const room = useRoomContext();

  useEffect(() => {
    const joined = (participant: RemoteParticipant) =>
      toast(`${displayName(participant)} entrou na sala`, { duration: 3000 });
    const left = (participant: RemoteParticipant) =>
      toast(`${displayName(participant)} saiu da sala`, { duration: 3000 });
    const published = (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (publication.source !== Track.Source.ScreenShare) return;
      toast(`${displayName(participant)} começou a mostrar a tela`, { duration: 3000 });
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
