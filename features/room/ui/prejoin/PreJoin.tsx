import { ArrowLeft, ArrowRight, Headphones, Loader2, Ticket } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { upsetMascot } from "@/features/mascot/client/events";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { requestToken } from "@/features/room/client/api";
import { joinFailure, type JoinChoices } from "@/features/room/domain/join";
import type { RoomPresence } from "@/features/room/domain/presence";
import { roomLink } from "@/features/room/domain/room-code";
import { useMicSetup } from "@/features/room/hooks/use-mic-setup";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { gsap, MOTION_QUERIES, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap";
import { formText } from "@/lib/utils";
import { InviteLinkButton } from "./InviteLinkButton";
import { MicSetup } from "./MicSetup";
import { NameRow } from "./NameRow";
import { PasswordField } from "./PasswordField";
import { PresenceLine } from "./PresenceLine";

interface PreJoinProps {
  code: string;
  /** Signed-in account name: how the person appears in the room. */
  userName: string;
  passwordRequired: boolean;
  /** Dashboard invite: replaces the access password. */
  invite?: string;
  /** People in the room now (null: unknown). */
  presence: RoomPresence | null;
  maxParticipants: number;
  onJoin: (choices: JoinChoices) => void;
  /** Download the call UI while the token request is in flight. */
  onPrepareJoin?: () => void;
}

const subscribeNothing = () => () => {};

/** Native submission stays unavailable until the client handler is attached. */
function useJoinDisabled(submitting: boolean) {
  const ready = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  return !ready || submitting;
}

/** Pre-join: confirms who is joining, tests the microphone, asks for the password and the token. */
export function PreJoin({
  code,
  userName,
  passwordRequired,
  invite,
  presence,
  maxParticipants,
  onJoin,
  onPrepareJoin,
}: PreJoinProps) {
  const scope = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(userName);
  const [formError, setFormError] = useState<{ message: string; field?: "password" }>();
  const [submitting, setSubmitting] = useState(false);
  const joinDisabled = useJoinDisabled(submitting);
  const meterRef = useRef<HTMLDivElement>(null);
  const mic = useMicSetup(submitting, meterRef);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.fromTo(
          scope.current,
          { y: 12, opacity: 0, scale: 0.985 },
          { y: 0, opacity: 1, scale: 1, duration: 0.28 },
        );
        gsap.from("[data-anim=row]", { y: 6, opacity: 0, duration: 0.2, stagger: 0.025 });
      });
    },
    { scope },
  );

  // With an access password, focus starts on the only missing field.
  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  /** Shows the error and moves focus to the field that needs fixing. */
  function showFailure(message: string, failure: ReturnType<typeof joinFailure>) {
    setFormError({ message, field: failure.passwordField ? "password" : undefined });
    if (failure.passwordField) passwordRef.current?.focus();
    upsetMascot(failure.mood, (failure.passwordField && passwordRef.current) || undefined);
    if (!prefersReducedMotion()) {
      gsap.fromTo(scope.current, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const password = passwordRequired
      ? formText(new FormData(event.currentTarget), "password")
      : undefined;

    if (passwordRequired && !password) {
      setFormError({
        message: "Digite a senha que recebeu de quem enviou o convite.",
        field: "password",
      });
      passwordRef.current?.focus();
      upsetMascot("grumpy", passwordRef.current ?? undefined);
      return;
    }

    setFormError(undefined);
    setSubmitting(true);
    onPrepareJoin?.();
    const result = await requestToken({ room: code, password, invite });
    if (!result.ok) {
      const failure = joinFailure(result.code);
      // Session expired or email not verified yet: come back to the room afterwards.
      if (failure.redirect) {
        const back = encodeURIComponent(roomLink(code, invite));
        const page = failure.redirect === "login" ? "/entrar" : "/verificar-email";
        window.location.assign(`${page}?voltar=${back}`);
        return;
      }
      setSubmitting(false);
      showFailure(result.message, failure);
      return;
    }

    onJoin({
      password,
      token: result.data.token,
      serverUrl: result.data.serverUrl,
      // Microphone blocked: join listen-only instead of failing inside.
      micEnabled: mic.enabled && !mic.blocked,
      audioDeviceId: mic.deviceId,
    });
  }

  return (
    <form
      ref={scope}
      method="post"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="apple-buttons flex w-full max-w-lg flex-col items-center gap-5"
    >
      <header data-anim="row" className="flex w-full flex-col items-center gap-2 text-center">
        <Mascot
          className="size-20 sm:size-24"
          sizes="(min-width: 640px) 288px, 240px"
          canSleep={!mic.testing && !submitting}
          activity={submitting ? "waiting" : mic.testing ? "listening" : "idle"}
          voiceLevelRef={mic.levelRef}
        />
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Pronto para entrar?</h1>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <p className="text-sm text-ink-muted">
              Sala{" "}
              <span translate="no" className="font-sans font-medium text-ink tabular-nums">
                {code}
              </span>
            </p>
            <InviteLinkButton code={code} />
          </div>
          <PresenceLine presence={presence} max={maxParticipants} />
          {invite ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-medium text-ink">
              <Ticket className="size-3.5 text-brand-soft" aria-hidden="true" />
              Você tem convite: não precisa de senha
            </span>
          ) : null}
        </div>
      </header>

      <div
        data-anim="row"
        className="w-full divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <NameRow name={name} onChange={setName} />
        <MicSetup mic={mic} meterRef={meterRef} />
      </div>

      {passwordRequired ? (
        <PasswordField
          inputRef={passwordRef}
          error={formError?.field === "password" ? formError.message : undefined}
          onChange={() => setFormError(undefined)}
        />
      ) : null}

      {formError && !formError.field ? (
        <p className="-mt-2 w-full text-center text-base text-danger" role="alert">
          {formError.message}
        </p>
      ) : null}

      <div data-anim="row" className="flex w-full flex-col items-center gap-2.5">
        <Button
          type="submit"
          size="lg"
          disabled={joinDisabled}
          onMouseEnter={onPrepareJoin}
          onFocus={onPrepareJoin}
          className="h-12! w-full"
        >
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Entrando…" : mic.joinsMuted ? "Entrar só ouvindo" : "Entrar na sala"}
          {submitting ? null : <ArrowRight aria-hidden="true" />}
        </Button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao início
        </Link>
        <div className="mt-2 flex flex-col items-center gap-1 text-center text-sm text-ink-muted">
          {mic.enabled ? (
            <p className="inline-flex items-center gap-1.5">
              <Headphones className="size-3.5 shrink-0" aria-hidden="true" />
              Use fones de ouvido para evitar eco.
            </p>
          ) : null}
          <ShareSupportNote variant="prejoin" />
        </div>
      </div>
    </form>
  );
}
