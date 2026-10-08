import {
  useDataChannel,
  useLocalParticipant,
  useParticipantAttribute,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent, type Participant } from "livekit-client";
import { Hand, Smile } from "lucide-react";
import { Popover } from "radix-ui";
import { createContext, use, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { useTimeouts } from "@/lib/hooks/use-timeouts";
import { setHandRaised } from "@/features/room/client/api";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";
import { participantName, SELF_LABEL } from "@/features/room/domain/participant-label";
import {
  createReceiveThrottle,
  decodeMessage,
  encodeMessage,
  HAND_ATTRIBUTE,
  reactionSchema,
  REACTIONS,
  TOPICS,
  type Reaction,
} from "@/features/room/domain/data-channel";
import { DockButton } from "./DockButton";
import { DockPopoverContent } from "./DockPopover";

interface FloatingReaction {
  id: number;
  emoji: Reaction;
  name: string;
  /** Horizontal position, in % of the screen width. */
  left: number;
}

/** On screen at the same time: the rest is dropped (spam does not freeze the room). */
const MAX_VISIBLE = 24;
const VISIBLE_MS = 3200;
/** Minimum interval between reactions sent by this person. */
const SEND_INTERVAL_MS = 250;

const ReactionsContext = createContext<((emoji: Reaction) => void) | null>(null);

/** Receives and shows the room's reactions; `useReact()` sends. */
export function ReactionsProvider({ children }: { children: ReactNode }) {
  const room = useRoomContext();
  const [items, setItems] = useState<FloatingReaction[]>([]);
  const nextId = useRef(0);
  const lastSent = useRef(0);
  const later = useTimeouts();

  function show(emoji: Reaction, name: string) {
    const id = nextId.current++;
    const left = 6 + Math.random() * 28;
    setItems((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, emoji, name, left }]);
    later(() => setItems((list) => list.filter((item) => item.id !== id)), VISIBLE_MS);
  }

  const [acceptFrom] = useState(() => createReceiveThrottle(SEND_INTERVAL_MS / 2));

  const { send } = useDataChannel(TOPICS.reaction, (message) => {
    const sender = message.from?.identity;
    if (!sender || !acceptFrom(sender)) return;
    const data = decodeMessage(message.payload, reactionSchema);
    if (data) show(data.emoji, participantName(message.from));
  });

  function react(emoji: Reaction) {
    const now = Date.now();
    if (now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    show(emoji, SELF_LABEL);
    send(encodeMessage({ emoji }), { reliable: true }).catch(() => {
      toast.error("Não foi possível enviar a reação.");
    });
  }

  // Notice when someone raises their hand.
  useEffect(() => {
    const onAttributes = (changed: Record<string, string>, participant: Participant) => {
      if (participant.isLocal || !(HAND_ATTRIBUTE in changed)) return;
      if (changed[HAND_ATTRIBUTE]) toast(`✋ ${participantName(participant)} levantou a mão`);
    };
    room.on(RoomEvent.ParticipantAttributesChanged, onAttributes);
    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, onAttributes);
    };
  }, [room]);

  return (
    <ReactionsContext value={react}>
      {children}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-24 z-30 h-0">
        {items.map((item) => (
          <ReactionBubble key={item.id} item={item} />
        ))}
      </div>
    </ReactionsContext>
  );
}

function useReact(): (emoji: Reaction) => void {
  const react = use(ReactionsContext);
  if (!react) throw new Error("useReact requires a <ReactionsProvider>");
  return react;
}

function ReactionBubble({ item }: { item: FloatingReaction }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap
          .timeline()
          .fromTo(
            el,
            { y: 0, scale: 0.4, opacity: 0 },
            { y: -40, scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" },
          )
          .to(el, { y: -300, x: gsap.utils.random(-40, 40), duration: 2.6, ease: "power1.out" })
          .to(el, { opacity: 0, duration: 0.6 }, "-=0.6");
      });
      mm.add(MOTION_QUERIES.reduced, () => {
        gsap
          .timeline()
          .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 })
          .to(el, { opacity: 0, duration: 0.4, delay: 2.4 });
      });
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className="absolute bottom-0 flex flex-col items-center gap-1 opacity-0"
      style={{ left: `${item.left}%` }}
    >
      <span className="text-4xl drop-shadow-lg">{item.emoji}</span>
      <span className="glass rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap">
        {item.name}
      </span>
    </div>
  );
}

/** Dock: quick reactions and "raise hand" (shortcut H). */
export function ReactionsMenu() {
  const react = useReact();
  const [open, setOpen] = useState(false);
  const handId = useId();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const handRaised =
    useParticipantAttribute(HAND_ATTRIBUTE, { participant: localParticipant }) === "1";

  function toggleHand() {
    const next = !handRaised;
    void setHandRaised(room.name, next).then((ok) => {
      if (ok) {
        toast(next ? "✋ Você levantou a mão" : "Você baixou a mão");
        return;
      }
      toast.error(`Não foi possível ${next ? "levantar" : "baixar"} a mão. Tente de novo.`);
    });
  }

  useShortcut("h", toggleHand);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <DockButton
          label={handRaised ? "Reações (mão levantada)" : "Reações"}
          tone={handRaised ? "active" : "default"}
          caption={handRaised ? "Mão erguida" : "Reações"}
          shortCaption={handRaised ? "Mão" : "Reações"}
          pressed={open}
        >
          {handRaised ? (
            <Hand className="size-5" aria-hidden="true" />
          ) : (
            <Smile className="size-5" aria-hidden="true" />
          )}
        </DockButton>
      </Popover.Trigger>
      <DockPopoverContent aria-label="Reações">
        <div className="flex gap-1">
          {REACTIONS.map((emoji, index) => (
            <button
              key={emoji}
              type="button"
              autoFocus={index === 0}
              onClick={() => react(emoji)}
              aria-label={`Reagir com ${emoji}`}
              className="grid size-11 place-items-center rounded-xl text-2xl transition-[transform,background-color] duration-150 hover:scale-115 hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5">
          <Label htmlFor={handId} className="gap-2.5 text-sm font-medium">
            <Hand className="size-4 text-ink-subtle" aria-hidden="true" />
            Levantar a mão
            <kbd className="rounded-md border border-line px-1.5 text-[0.7rem] text-ink-subtle">
              H
            </kbd>
          </Label>
          <Switch id={handId} checked={handRaised} onCheckedChange={toggleHand} />
        </div>
      </DockPopoverContent>
    </Popover.Root>
  );
}
