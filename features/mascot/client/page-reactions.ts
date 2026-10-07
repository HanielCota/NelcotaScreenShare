import type { Expression } from "@/features/mascot/domain/face";
import type { createPersonality, MascotActivity } from "@/features/mascot/domain/personality";
import type { Reason } from "@/features/mascot/domain/reasons";
import { HAPPY_AFTER_TYPING_MS } from "@/features/mascot/domain/rules";
import type { PageInputHandlers } from "./page-input";

/** What the page reactions need from the mascot (provided by the controller). */
export interface PageReactionContext {
  root: HTMLElement;
  personality: ReturnType<typeof createPersonality>;
  activity(): MascotActivity;
  setReason(reason: Reason, expression: Expression, durationMs?: number): void;
  clearReason(reason: Reason): void;
  /** Removes without recomputing (the next setReason recomputes). */
  dropReason(reason: Reason): void;
  setPointer(pointer: { x: number; y: number } | null): void;
  update(): void;
  requestUpdate(): void;
  onActivity(): void;
  pauseMotion(): void;
}

/** Page mouse, focus, typing and scrolling become expression and gaze. */
export function pageReactions(ctx: PageReactionContext): PageInputHandlers {
  let curiosityTarget: Element | null = null;

  function resetPointer() {
    ctx.setPointer(null);
    curiosityTarget = null;
    ctx.clearReason("curiosity");
    ctx.requestUpdate();
  }

  return {
    pointerMove(event) {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      ctx.setPointer({ x: event.clientX, y: event.clientY });
      ctx.onActivity();
      // Hovered over a button or link outside of it: gets curious.
      const control =
        event.target instanceof Element
          ? event.target.closest("button, a[href], [role=button]")
          : null;
      const next = control && !ctx.root.contains(control) ? control : null;
      if (next !== curiosityTarget) {
        curiosityTarget = next;
        if (next && ctx.activity() === "idle") ctx.setReason("curiosity", "curious");
        else ctx.clearReason("curiosity");
      }
      ctx.requestUpdate();
    },
    // When leaving the window, looks forward again (or at the focused field).
    pointerOut(event) {
      if (event.relatedTarget === null && event.pointerType !== "touch") resetPointer();
    },
    pointerDown: () => ctx.onActivity(),
    windowBlur: resetPointer,
    windowFocus: () => ctx.onActivity(),
    // Scrolling moves everything on screen: the gaze must follow.
    scroll() {
      ctx.onActivity();
      ctx.requestUpdate();
    },
    layoutChange: () => ctx.requestUpdate(),
    // Focus only changes after focusout; waits for the next cycle to read the active element.
    focusChange(event) {
      ctx.setPointer(null);
      ctx.onActivity();
      if (
        event.type === "focusin" &&
        event.target instanceof HTMLElement &&
        ctx.root.contains(event.target) &&
        event.target.dataset.mascotAction === "high-five"
      ) {
        ctx.personality.offerHighFive(true);
      }
      if (event.type === "focusout") ctx.clearReason("capsLock");
      ctx.requestUpdate();
    },
    input(event) {
      ctx.setPointer(null);
      ctx.onActivity();
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        ctx.update();
        return;
      }
      // Typing: gets happy and "forgives" the previous error.
      ctx.dropReason("error");
      ctx.setReason("typing", "happy", HAPPY_AFTER_TYPING_MS);
    },
    key(event) {
      ctx.setPointer(null);
      ctx.onActivity();
      // Autofill fires "keydown"/"keyup" without getModifierState: ignore it.
      if (!(event instanceof KeyboardEvent) || !(event.target instanceof HTMLInputElement)) return;
      // Caps Lock on in a field: wide eyes, reinforcing the on-screen warning.
      if (event.getModifierState("CapsLock")) ctx.setReason("capsLock", "surprised");
      else ctx.clearReason("capsLock");
    },
    visibilityChange() {
      if (document.hidden) ctx.pauseMotion();
      else {
        ctx.onActivity();
        ctx.update();
      }
    },
  };
}
