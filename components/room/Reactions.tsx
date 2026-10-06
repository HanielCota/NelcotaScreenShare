"use client";

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
import { useShortcut } from "@/hooks/useShortcut";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/gsap";
import {
  decodeMessage,
  encodeMessage,
  HAND_ATTRIBUTE,
  reactionSchema,
  REACTIONS,
  TOPICS,
  type Reaction,
} from "@/lib/room-data";
import { DockButton } from "./DockButton";

interface FloatingReaction {
  id: number;
  emoji: Reaction;
  name: string;
  /** Posição horizontal, em % da largura da tela. */
  left: number;
}

/** Na tela ao mesmo tempo: o resto é descartado (spam não trava a sala). */
const MAX_VISIBLE = 24;
const VISIBLE_MS = 3200;
/** Intervalo mínimo entre reações enviadas por esta pessoa. */
const SEND_INTERVAL_MS = 250;

const ReactionsContext = createContext<((emoji: Reaction) => void) | null>(null);

function displayName(participant: Participant | undefined): string {
  return participant?.name || participant?.identity || "Alguém";
}

/** Recebe e mostra as reações da sala; `useReact()` envia. */
export function ReactionsProvider({ children }: { children: ReactNode }) {
  const room = useRoomContext();
  const [items, setItems] = useState<FloatingReaction[]>([]);
  const nextId = useRef(0);
  const lastSent = useRef(0);

  function show(emoji: Reaction, name: string) {
    const id = nextId.current++;
    const left = 6 + Math.random() * 28;
    setItems((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, emoji, name, left }]);
    setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), VISIBLE_MS);
  }

  const { send } = useDataChannel(TOPICS.reaction, (message) => {
    const data = decodeMessage(message.payload, reactionSchema);
    if (data) show(data.emoji, displayName(message.from));
  });

  function react(emoji: Reaction) {
    const now = Date.now();
    if (now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    show(emoji, "Você");
    send(encodeMessage({ emoji }), { reliable: true }).catch(() => {
      toast.error("Não foi possível enviar a reação.");
    });
  }

  // Aviso quando alguém levanta a mão.
  useEffect(() => {
    const onAttributes = (changed: Record<string, string>, participant: Participant) => {
      if (participant.isLocal || !(HAND_ATTRIBUTE in changed)) return;
      if (changed[HAND_ATTRIBUTE]) toast(`✋ ${displayName(participant)} levantou a mão`);
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
  if (!react) throw new Error("useReact precisa de um <ReactionsProvider>");
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
      <span className="glass rounded-lg px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
        {item.name}
      </span>
    </div>
  );
}

/** Dock: reações rápidas e "levantar a mão" (atalho H). */
export function ReactionsMenu() {
  const react = useReact();
  const [open, setOpen] = useState(false);
  const handId = useId();
  const { localParticipant } = useLocalParticipant();
  const handRaised =
    useParticipantAttribute(HAND_ATTRIBUTE, { participant: localParticipant }) === "1";

  function toggleHand() {
    const next = !handRaised;
    localParticipant.setAttributes({ [HAND_ATTRIBUTE]: next ? "1" : "" }).then(
      () => toast(next ? "✋ Você levantou a mão" : "Você baixou a mão"),
      () => toast.error("Não foi possível levantar a mão. Tente de novo."),
    );
  }

  useShortcut("h", toggleHand);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <DockButton
          label={handRaised ? "Reações (mão levantada)" : "Reações"}
          tone={handRaised ? "active" : "default"}
          pressed={open}
        >
          {handRaised ? (
            <Hand className="size-5" aria-hidden="true" />
          ) : (
            <Smile className="size-5" aria-hidden="true" />
          )}
        </DockButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={14}
          collisionPadding={16}
          aria-label="Reações"
          className="glass z-50 rounded-2xl p-2 outline-none"
        >
          <div className="flex gap-1">
            {REACTIONS.map((emoji, index) => (
              <button
                key={emoji}
                type="button"
                autoFocus={index === 0}
                onClick={() => react(emoji)}
                aria-label={`Reagir com ${emoji}`}
                className="grid size-11 place-items-center rounded-xl text-2xl transition-transform hover:scale-115 hover:bg-surface-3 focus-visible:bg-surface-3 motion-reduce:hover:scale-100"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5">
            <Label htmlFor={handId} className="gap-2.5 text-sm font-semibold">
              <Hand className="size-4 text-ink-subtle" aria-hidden="true" />
              Levantar a mão
              <kbd className="rounded-md border border-line px-1.5 text-[0.7rem] text-ink-subtle">
                H
              </kbd>
            </Label>
            <Switch id={handId} checked={handRaised} onCheckedChange={toggleHand} />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
