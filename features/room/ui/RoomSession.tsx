import { lazy, Suspense, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/shell/AppHeader";
import { requestToken } from "@/features/room/client/api";
import type { JoinChoices } from "@/features/room/domain/join";
import type { RoomPresence } from "@/features/room/domain/presence";
import { callDuration, type LeaveNotice, type LeaveReason } from "@/features/room/domain/leave";
import { roomLink } from "@/features/room/domain/room-code";
import { PreJoin } from "@/features/room/ui/prejoin/PreJoin";
const loadRoomView = () => import("./call/RoomView");
const RoomView = lazy(() => loadRoomView().then((module) => ({ default: module.RoomView })));
const prepareRoomView = () => {
  void loadRoomView().catch(() => {});
};
import { LeftScreen } from "./LeftScreen";

interface RoomSessionProps {
  code: string;
  userName: string;
  userImage: string | null;
  passwordRequired: boolean;
  invite?: string;
  maxParticipants: number;
  /** People in the room now (null: unknown). */
  presence: RoomPresence | null;
  /** Another page is open: a call goes on hidden; anything else shows nothing. */
  minimized: boolean;
  /** Whether there is a call to keep while the person visits other pages. */
  onCallChange: (inCall: boolean) => void;
}

type Phase =
  | { kind: "prejoin" }
  /** `startedAt`: when they joined, for the leave summary (kept across attempts). */
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
  minimized,
  onCallChange,
}: RoomSessionProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "prejoin" });
  const inCall = phase.kind === "room";
  const reportCall = useEffectEvent(onCallChange);

  useEffect(() => {
    reportCall(inCall);
  }, [inCall]);

  // New attempt with a new token: the previous one may have expired (10 min TTL).
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
    // The leave screen is not on display: the notice goes to a toast instead.
    if (minimized) toast.info(notice?.message ?? "Você saiu da sala.");
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
          <output hidden={minimized} className="grid min-h-dvh place-items-center text-ink-muted">
            Preparando a sala…
          </output>
        }
      >
        <RoomView
          key={phase.attempt}
          code={code}
          choices={phase.choices}
          maxParticipants={maxParticipants}
          minimized={minimized}
          onLeave={(notice) => leave(notice, phase.startedAt)}
          onRetry={() => retry(phase.choices, phase.attempt, phase.startedAt)}
        />
      </Suspense>
    );
  }

  if (minimized) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        account={{ name: userName, image: userImage }}
        accountHref={`/conta?voltar=${encodeURIComponent(roomLink(code, invite))}`}
      />
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        {phase.kind === "prejoin" ? (
          <PreJoin
            onPrepareJoin={prepareRoomView}
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
