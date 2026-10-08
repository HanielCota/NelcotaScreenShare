import { ArrowLeft, ArrowRight, Headphones, Loader2, Ticket } from "lucide-react";
import { Link, useLocation, useViewTransitionState } from "react-router";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import { subscribeNothing } from "@/lib/hooks/subscribe-nothing";
import { upsetMascot } from "@/features/mascot/client/events";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { requestToken } from "@/features/room/client/api";
import { joinFailure, type JoinChoices } from "@/features/room/domain/join";
import { displayNameSchema } from "@/features/room/domain/participant-label";
import type { RoomPresence } from "@/features/room/domain/presence";
import { roomLink } from "@/features/room/domain/room-code";
import { useGuestName } from "@/features/room/hooks/use-guest-name";
import { useMicSetup } from "@/features/room/hooks/use-mic-setup";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import {
  gsap,
  MOTION_DURATION,
  MOTION_QUERIES,
  prefersReducedMotion,
  useGSAP,
} from "@/lib/animation/gsap";
import { formText } from "@/lib/utils";
import { GuestNameRow } from "./GuestNameRow";
import { InviteLinkButton } from "./InviteLinkButton";
import { MicSetup } from "./MicSetup";
import { NameRow } from "./NameRow";
import { PasswordField } from "./PasswordField";
import { PresenceLine } from "./PresenceLine";

interface PreJoinProps {
  code: string;
  /** Signed-in account name: how the person appears in the room. Null for a guest. */
  userName: string | null;
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

/** Who joins: the account's name (editable), or a guest's name field. */
function IdentityRow({
  userName,
  guestName,
  guestNameRef,
  error,
  signInHref,
  onGuestEdit,
}: {
  userName: string | null;
  guestName: ReturnType<typeof useGuestName>;
  guestNameRef: RefObject<HTMLInputElement | null>;
  error: { message: string; field?: string } | undefined;
  signInHref: string;
  /** The guest typed: clears the error shown on the field. */
  onGuestEdit: () => void;
}) {
  const [accountName, setAccountName] = useState(userName);
  if (accountName !== null) return <NameRow name={accountName} onChange={setAccountName} />;
  return (
    <GuestNameRow
      inputRef={guestNameRef}
      name={guestName.name}
      error={error?.field === "name" ? error.message : undefined}
      signInHref={signInHref}
      onChange={(value) => {
        guestName.setName(value);
        onGuestEdit();
      }}
    />
  );
}

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
  const transitioning = useViewTransitionState(useLocation().pathname);
  const passwordRef = useRef<HTMLInputElement>(null);
  const guestNameRef = useRef<HTMLInputElement>(null);
  const guest = userName === null;
  const guestName = useGuestName();
  const [formError, setFormError] = useState<{ message: string; field?: "password" | "name" }>();
  const [submitting, setSubmitting] = useState(false);
  const joinDisabled = useJoinDisabled(submitting);
  const meterRef = useRef<HTMLDivElement>(null);
  const mic = useMicSetup(submitting, meterRef);

  useGSAP(
    () => {
      if (transitioning) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from(scope.current, {
          y: 10,
          opacity: 0,
          duration: MOTION_DURATION.entrance,
          clearProps: "transform,opacity",
        });
      });
    },
    { scope },
  );

  // Focus starts on the first missing field: the guest's name, else the access password.
  useEffect(() => {
    if (guest && !guestNameRef.current?.value) {
      guestNameRef.current?.focus();
      return;
    }
    passwordRef.current?.focus();
  }, [guest]);

  /** Shows the error and moves focus to the field that needs fixing. */
  function showFailure(message: string, failure: ReturnType<typeof joinFailure>) {
    setFormError({ message, field: failure.passwordField ? "password" : undefined });
    if (failure.passwordField) passwordRef.current?.focus();
    upsetMascot(failure.mood, (failure.passwordField && passwordRef.current) || undefined);
    if (!prefersReducedMotion()) {
      gsap.to(scope.current, {
        keyframes: [{ x: -4 }, { x: 4 }, { x: 0 }],
        duration: MOTION_DURATION.surface,
        ease: "sine.inOut",
        overwrite: "auto",
      });
    }
  }

  /** Marks the field to fix, focuses it and lets the mascot react. */
  function rejectField(field: "password" | "name", message: string) {
    const ref = field === "name" ? guestNameRef : passwordRef;
    setFormError({ message, field });
    ref.current?.focus();
    upsetMascot("grumpy", ref.current ?? undefined);
  }

  /** What the form adds to the token request, or undefined when a field needs fixing. */
  function readFields(
    form: HTMLFormElement,
  ): { password?: string; guestName?: string } | undefined {
    const parsedName = guest ? displayNameSchema.safeParse(guestName.name) : undefined;
    if (parsedName && !parsedName.success) {
      rejectField("name", parsedName.error.issues[0]?.message ?? "Digite seu nome.");
      return undefined;
    }
    const password = passwordRequired ? formText(new FormData(form), "password") : undefined;
    if (passwordRequired && !password) {
      rejectField("password", "Digite a senha que recebeu de quem enviou o convite.");
      return undefined;
    }
    return { password, guestName: parsedName?.data };
  }

  /** Session expired or e-mail not verified: that screen, then back to the room. */
  function handleRefusal(error: Parameters<typeof joinFailure>[0], message: string) {
    const failure = joinFailure(error);
    if (failure.redirect) {
      const page = failure.redirect === "login" ? "/entrar" : "/verificar-email";
      window.location.assign(`${page}?voltar=${encodeURIComponent(roomLink(code, invite))}`);
      return;
    }
    setSubmitting(false);
    showFailure(message, failure);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const fields = readFields(event.currentTarget);
    if (!fields) return;

    setFormError(undefined);
    setSubmitting(true);
    onPrepareJoin?.();
    const result = await requestToken({ room: code, invite, ...fields });
    if (!result.ok) {
      handleRefusal(result.code, result.message);
      return;
    }

    if (fields.guestName) guestName.remember(fields.guestName);
    onJoin({
      ...fields,
      token: result.data.token,
      serverUrl: result.data.serverUrl,
      // Microphone blocked: join listen-only instead of failing inside.
      micEnabled: !mic.joinsMuted,
      audioDeviceId: mic.deviceId,
    });
  }

  return (
    <form
      ref={scope}
      method="post"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="flex w-full max-w-lg flex-col items-center gap-5"
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
          <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
            Pronto para entrar?
          </h1>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <p className="text-sm text-ink-muted">
              Sala{" "}
              <span translate="no" className="font-sans font-medium text-ink tabular-nums">
                {code}
              </span>
            </p>
            <InviteLinkButton code={code} />
          </div>
          <PresenceLine presence={presence} max={maxParticipants} guest={guest} />
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
        <IdentityRow
          userName={userName}
          guestName={guestName}
          guestNameRef={guestNameRef}
          error={formError}
          signInHref={`/entrar?voltar=${encodeURIComponent(roomLink(code, invite))}`}
          onGuestEdit={() => setFormError(undefined)}
        />
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
          viewTransition
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
