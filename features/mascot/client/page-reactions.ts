import type { Expression } from "@/features/mascot/domain/face";
import type { createPersonality, MascotActivity } from "@/features/mascot/domain/personality";
import type { Reason } from "@/features/mascot/domain/reasons";
import { HAPPY_AFTER_TYPING_MS } from "@/features/mascot/domain/rules";
import type { PageInputHandlers } from "./page-input";

/** O que as reações à página precisam do mascote (o controlador fornece). */
export interface PageReactionContext {
  root: HTMLElement;
  personality: ReturnType<typeof createPersonality>;
  activity(): MascotActivity;
  setReason(reason: Reason, expression: Expression, durationMs?: number): void;
  clearReason(reason: Reason): void;
  /** Remove sem recalcular (o próximo setReason recalcula). */
  dropReason(reason: Reason): void;
  setPointer(pointer: { x: number; y: number } | null): void;
  update(): void;
  requestUpdate(): void;
  onActivity(): void;
  pauseMotion(): void;
}

/** Mouse, foco, digitação e rolagem da página viram expressão e olhar. */
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
      // Passou por cima de um botão ou link fora dele: fica curioso.
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
    // Ao sair da janela, volta a olhar para a frente (ou para o campo com foco).
    pointerOut(event) {
      if (event.relatedTarget === null && event.pointerType !== "touch") resetPointer();
    },
    pointerDown: () => ctx.onActivity(),
    windowBlur: resetPointer,
    windowFocus: () => ctx.onActivity(),
    // Rolar muda a posição de tudo na tela: o olhar precisa acompanhar.
    scroll() {
      ctx.onActivity();
      ctx.requestUpdate();
    },
    layoutChange: () => ctx.requestUpdate(),
    // O foco só muda depois do focusout; espera o próximo ciclo pra ler o elemento ativo.
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
      // Digitando: fica feliz e "perdoa" o erro anterior.
      ctx.dropReason("error");
      ctx.setReason("typing", "happy", HAPPY_AFTER_TYPING_MS);
    },
    key(event) {
      ctx.setPointer(null);
      ctx.onActivity();
      // O preenchimento automático dispara "keydown"/"keyup" sem getModifierState: ignora.
      if (!(event instanceof KeyboardEvent) || !(event.target instanceof HTMLInputElement)) return;
      // Caps Lock ligado num campo: olhos arregalados, reforçando o aviso da tela.
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
