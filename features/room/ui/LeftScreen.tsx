import { ArrowLeft, Check, Link2, Lock, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useViewTransitionState } from "react-router";
import { Button } from "@/components/ui/button";
import type { Expression } from "@/features/mascot/domain/face";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { formatCallDuration, type LeaveReason } from "@/features/room/domain/leave";
import { roomPath } from "@/features/room/domain/room-code";
import { gsap, MOTION_DURATION, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";

/** Title, mascot mood and what can be done for each leave reason. */
const COPY: Record<
  LeaveReason,
  { title: string; expression: Expression; rejoin: string | null; copyLink: boolean }
> = {
  self: {
    title: "Você saiu da sala",
    expression: "happy",
    rejoin: "Voltar para a sala",
    copyLink: true,
  },
  dropped: {
    title: "A conexão caiu",
    expression: "worried",
    rejoin: "Voltar para a sala",
    copyLink: true,
  },
  failed: {
    title: "Não foi possível entrar",
    expression: "worried",
    rejoin: "Tentar de novo",
    copyLink: false,
  },
  // Rejoining here drops the other tab: it stays an option, not the main action.
  elsewhere: {
    title: "Você está na sala em outro lugar",
    expression: "surprised",
    rejoin: "Usar esta aba",
    copyLink: false,
  },
  ended: { title: "A sala foi encerrada", expression: "neutral", rejoin: null, copyLink: false },
  removed: {
    title: "Você foi removido da sala",
    expression: "neutral",
    rejoin: null,
    copyLink: false,
  },
};

function CopyRoomLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      variant="outline"
      size="lg"
      aria-live="polite"
      onClick={() => {
        // Without the invite: the link is meant to be sent to another person.
        void navigator.clipboard
          .writeText(`${window.location.origin}${roomPath(code)}`)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
    >
      {copied ? (
        <Check className="text-success" aria-hidden="true" />
      ) : (
        <Link2 aria-hidden="true" />
      )}
      {copied ? "Link copiado" : "Copiar link"}
    </Button>
  );
}

/**
 * After the call: why it ended, how long it lasted and the next step.
 * No card: the mascot says goodbye, just as it welcomed on the way in.
 */
export function LeftScreen({
  code,
  reason,
  message,
  durationMs,
  onRejoin,
}: {
  code: string;
  reason: LeaveReason;
  message?: string;
  /** Time in the call; absent when the person never got in. */
  durationMs?: number;
  onRejoin: () => void;
}) {
  const scope = useRef<HTMLElement>(null);
  const copy = COPY[reason];
  const transitioning = useViewTransitionState(useLocation().pathname);
  const joined = durationMs !== undefined && reason !== "failed";
  // Room ended or person removed: the way forward is the home page, not the same room.
  const rejoinIsPrimary = copy.rejoin !== null && reason !== "elsewhere";

  useGSAP(
    () => {
      if (transitioning) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from("[data-anim=left]", {
          y: 10,
          opacity: 0,
          duration: MOTION_DURATION.entrance,
          stagger: 0.045,
          clearProps: "transform,opacity",
        });
      });
    },
    { scope },
  );

  // Focus on the next step: Enter goes back to the room (or to the home page).
  useEffect(() => {
    scope.current?.querySelector<HTMLElement>("[data-primary]")?.focus();
  }, []);

  return (
    <section
      ref={scope}
      aria-labelledby="left-title"
      role={reason === "self" ? undefined : "alert"}
      className="apple-buttons flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <div data-anim="left">
        <Mascot
          className="size-28"
          sizes="336px"
          canSleep={false}
          expression={copy.expression}
          activity={reason === "self" ? "greeting" : "idle"}
        />
      </div>

      <div data-anim="left" className="flex flex-col gap-2">
        <h1 id="left-title" className="text-3xl font-medium tracking-tight text-balance">
          {copy.title}
        </h1>
        {joined ? (
          <p className="text-lg text-pretty text-ink-muted">
            Você ficou{" "}
            <strong className="font-medium text-ink">{formatCallDuration(durationMs)}</strong> na
            sala{" "}
            <span translate="no" className="font-medium text-ink tabular-nums">
              {code}
            </span>
            .
          </p>
        ) : null}
        {reason !== "self" && message ? (
          <p className="text-base text-pretty text-ink-muted">{message}</p>
        ) : null}
      </div>

      <div data-anim="left" className="flex w-full flex-col items-center gap-3">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center [&>*]:sm:flex-1">
          {rejoinIsPrimary ? (
            <Button size="lg" data-primary="" onClick={onRejoin}>
              <RotateCcw aria-hidden="true" />
              {copy.rejoin}
            </Button>
          ) : (
            <Button asChild size="lg" data-primary="">
              <Link viewTransition to="/">
                <Plus aria-hidden="true" />
                {reason === "ended" ? "Criar nova sala" : "Ir para o início"}
              </Link>
            </Button>
          )}
          {copy.copyLink ? <CopyRoomLink code={code} /> : null}
          {copy.rejoin && !rejoinIsPrimary ? (
            <Button variant="outline" size="lg" onClick={onRejoin}>
              <RotateCcw aria-hidden="true" />
              {copy.rejoin}
            </Button>
          ) : null}
        </div>
        {rejoinIsPrimary ? (
          <Link
            viewTransition
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ir para o início
          </Link>
        ) : null}
      </div>

      {joined ? (
        <p
          data-anim="left"
          className="flex items-center gap-1.5 text-sm text-pretty text-ink-subtle"
        >
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          O chat foi apagado e nada da chamada foi gravado.
        </p>
      ) : null}
    </section>
  );
}
