"use client";

import { DoorOpen, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestToken } from "@/features/room/client/api";
import { PreJoin, type JoinChoices } from "@/features/room/ui/prejoin/PreJoin";
import { RoomView } from "@/features/room/ui/call/RoomView";
import { StatusScreen } from "./StatusScreen";

interface RoomSessionProps {
  code: string;
  userName: string;
  passwordRequired: boolean;
  invite?: string;
  maxParticipants: number;
  /** Pessoas na sala agora (null: desconhecido). */
  presence: { online: number } | null;
}

type Phase =
  | { kind: "prejoin" }
  | { kind: "room"; choices: JoinChoices; attempt: number }
  | { kind: "left"; message?: string };

export function RoomSession({
  code,
  userName,
  passwordRequired,
  invite,
  maxParticipants,
  presence,
}: RoomSessionProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "prejoin" });

  // Nova tentativa com token novo: o anterior pode ter expirado (TTL de 10 min).
  async function retry(choices: JoinChoices, attempt: number) {
    const result = await requestToken({ room: code, password: choices.password, invite });
    if (!result.ok) {
      setPhase({ kind: "left", message: result.message });
      return;
    }
    setPhase({
      kind: "room",
      choices: { ...choices, token: result.data.token, serverUrl: result.data.serverUrl },
      attempt: attempt + 1,
    });
  }

  if (phase.kind === "room") {
    return (
      <RoomView
        key={phase.attempt}
        code={code}
        choices={phase.choices}
        maxParticipants={maxParticipants}
        onLeave={(message) => setPhase({ kind: "left", message })}
        onRetry={() => retry(phase.choices, phase.attempt)}
      />
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-8">
      {phase.kind === "prejoin" ? (
        <PreJoin
          code={code}
          userName={userName}
          passwordRequired={passwordRequired && !invite}
          invite={invite}
          presence={presence}
          maxParticipants={maxParticipants}
          onJoin={(choices) => setPhase({ kind: "room", choices, attempt: 0 })}
        />
      ) : (
        <StatusScreen
          icon={DoorOpen}
          title="Você saiu da sala"
          message={phase.message ?? "Até a próxima!"}
        >
          <Button size="lg" onClick={() => setPhase({ kind: "prejoin" })}>
            <RotateCcw aria-hidden="true" />
            Entrar de novo
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home aria-hidden="true" />
              Início
            </Link>
          </Button>
        </StatusScreen>
      )}
    </main>
  );
}
