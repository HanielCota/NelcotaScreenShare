import { lazy, Suspense, useState } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { requestToken } from "@/features/room/client/api";
import type { JoinChoices } from "@/features/room/domain/join";
import { callDuration, type LeaveNotice, type LeaveReason } from "@/features/room/domain/leave";
import { roomLink } from "@/features/room/domain/room-code";
import { PreJoin } from "@/features/room/ui/prejoin/PreJoin";
const RoomView = lazy(() =>
  import("./call/RoomView").then((module) => ({ default: module.RoomView })),
);
import { LeftScreen } from "./LeftScreen";

interface RoomSessionProps {
  code: string;
  userName: string;
  userImage: string | null;
  passwordRequired: boolean;
  invite?: string;
  maxParticipants: number;
  /** Pessoas na sala agora (null: desconhecido). */
  presence: { online: number } | null;
}

type Phase =
  | { kind: "prejoin" }
  /** `startedAt`: quando entrou, para o resumo da saída (mantido entre tentativas). */
  | { kind: "room"; choices: JoinChoices; attempt: number; startedAt: number }
  | { kind: "left"; reason: LeaveReason; message?: string; durationMs?: number };

export function RoomSession({
  code,
  userName,
  userImage,
  passwordRequired,
  invite,
  maxParticipants,
  presence,
}: RoomSessionProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "prejoin" });

  // Nova tentativa com token novo: o anterior pode ter expirado (TTL de 10 min).
  async function retry(choices: JoinChoices, attempt: number, startedAt: number) {
    const result = await requestToken({ room: code, password: choices.password, invite });
    if (!result.ok) {
      setPhase({ kind: "left", reason: "failed", message: result.message });
      return;
    }
    setPhase({
      kind: "room",
      choices: { ...choices, token: result.data.token, serverUrl: result.data.serverUrl },
      attempt: attempt + 1,
      startedAt,
    });
  }

  function leave(notice: LeaveNotice | undefined, startedAt: number | undefined) {
    setPhase({
      kind: "left",
      reason: notice?.reason ?? "self",
      message: notice?.message,
      durationMs: notice?.reason === "failed" ? undefined : callDuration(startedAt, Date.now()),
    });
  }

  if (phase.kind === "room") {
    return (
      <Suspense
        fallback={
          <output className="grid min-h-dvh place-items-center text-ink-muted">
            Preparando a sala…
          </output>
        }
      >
        <RoomView
          key={phase.attempt}
          code={code}
          choices={phase.choices}
          maxParticipants={maxParticipants}
          onLeave={(notice) => leave(notice, phase.startedAt)}
          onRetry={() => retry(phase.choices, phase.attempt, phase.startedAt)}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        account={{ name: userName, image: userImage }}
        accountHref={`/conta?voltar=${encodeURIComponent(roomLink(code, invite))}`}
      />
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        {phase.kind === "prejoin" ? (
          <PreJoin
            code={code}
            userName={userName}
            passwordRequired={passwordRequired && !invite}
            invite={invite}
            presence={presence}
            maxParticipants={maxParticipants}
            onJoin={(choices) =>
              setPhase({ kind: "room", choices, attempt: 0, startedAt: Date.now() })
            }
          />
        ) : (
          <LeftScreen
            code={code}
            reason={phase.reason}
            message={phase.message}
            durationMs={phase.durationMs}
            onRejoin={() => setPhase({ kind: "prejoin" })}
          />
        )}
      </main>
    </div>
  );
}
