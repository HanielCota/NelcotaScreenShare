import { useEffect, useRef, type RefObject } from "react";
import { JUMP, NOD, PRESS, SHAKE } from "./body-motions";
import { onMascotSignal, type MascotSignal } from "./events";
import { EXPRESSIONS, toFaceState, type Expression, type FaceState } from "./face";
import { createFaceRenderer, type FaceRenderer } from "./face-renderer";
import { IDLE, focusedPasswordField, gazeFor, type Gaze } from "./gaze";
import { createReasons, type Reason } from "./reasons";
import { createHandMotions } from "./hand-motions";
import { springStep } from "./spring";
import { idleSleep } from "./sleep";
import { createPersonality, voiceAmount, type MascotActivity } from "./personality";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ZERO_FACE: FaceState = {
  tilt: 0,
  pupil: 0,
  lid0: 0,
  lid1: 0,
  rest: 0,
};

/** Molas criticamente amortecidas (sem quique); "response" em segundos, como na Apple. */
const GAZE_RESPONSE = 0.14;
const FACE_RESPONSE = 0.32;

/** Quanto tempo ele olha pra algo que pediu atenção (ex.: o alerta de erro). */
const ATTENTION_MS = 1500;
/** Fica com a cara do erro até a pessoa voltar a digitar (ou até passar esse tempo). */
const UPSET_MS = 4000;
const HAPPY_AFTER_TYPING_MS = 2000;
const CELEBRATE_MS = 1600;

/**
 * O comportamento do mascote: junta o que acontece na tela (mouse, foco, digitação, avisos do
 * sistema) numa expressão e num olhar, e anima o rosto até eles com molas.
 *
 * - Expressão: motivos com prazo e prioridade (reasons.ts).
 * - Olhar: geometria da tela (gaze.ts).
 * - Desenho: escrito direto no DOM a cada quadro (face-renderer.ts).
 */
export function useMascot(
  rootRef: RefObject<HTMLDivElement | null>,
  faceRef: RefObject<HTMLDivElement | null>,
  baseExpression: Expression,
  canSleep: boolean,
  activity: MascotActivity,
  voiceLevelRef?: RefObject<number>,
) {
  // Lida por referência: mudar a expressão de repouso não desmonta tudo (sono, erro, olhar);
  // só pede um recálculo.
  const baseRef = useRef(baseExpression);
  const updateRef = useRef<(() => void) | undefined>(undefined);
  // Também por referência, pelo mesmo motivo; ligar ou desligar só reinicia o relógio do sono.
  const canSleepRef = useRef(canSleep);
  const resetSleepRef = useRef<(() => void) | undefined>(undefined);
  const activityRef = useRef(activity);
  const voiceRef = useRef(voiceLevelRef);
  const contextChangedRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    activityRef.current = activity;
    voiceRef.current = voiceLevelRef;
    contextChangedRef.current?.();
  }, [activity, voiceLevelRef]);

  useEffect(() => {
    baseRef.current = baseExpression;
    updateRef.current?.();
  }, [baseExpression]);

  useEffect(() => {
    canSleepRef.current = canSleep;
    resetSleepRef.current?.();
  }, [canSleep]);

  useEffect(() => {
    const rootElement = rootRef.current;
    const faceElement = faceRef.current;
    const faceRenderer = faceElement && createFaceRenderer(faceElement);
    if (!rootElement || !faceElement || !faceRenderer) return;
    // Já sem nulo, com o tipo explícito: as funções declaradas abaixo usam estas constantes, e o
    // TypeScript não leva a checagem acima pra dentro delas.
    const root: HTMLElement = rootElement;
    const face: HTMLElement = faceElement;
    const renderer: FaceRenderer = faceRenderer;
    const hands = createHandMotions(root);

    // A preferência do sistema é lida a cada reação, inclusive se mudar com a página aberta.
    const reducedMotion = prefersReducedMotion;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reasons = createReasons();

    let pointer: { x: number; y: number } | null = null;
    let attention: { element: Element; until: number } | null = null;
    let current: Expression = baseRef.current;
    let gazeTarget: Gaze = IDLE;
    let faceTarget: FaceState = toFaceState(EXPRESSIONS[baseRef.current]);
    const gaze: Gaze = { ...IDLE };
    const gazeVelocity: Gaze = { ...IDLE };
    const faceState: FaceState = { ...faceTarget };
    const faceVelocity: FaceState = { ...ZERO_FACE };
    let frame = 0;
    let lastTime = 0;
    let blinkTimer = 0;
    let attentionTimer = 0;
    let reasonTimer = 0;
    let idleTimer = 0;
    let pressAnimation: Animation | undefined;
    let bodyAnimation: Animation | undefined;
    let blinkStarted = 0;
    /** Atualização agendada pro próximo quadro (vários eventos no mesmo quadro viram uma). */
    let queuedUpdate = 0;
    let lastActivity = performance.now();
    /** Depois de desmontado, atualizações atrasadas (timers) não fazem mais nada. */
    let disposed = false;
    let onScreen = true;
    let sleepStage: "sleepy" | "asleep" | null = null;
    let curiosityTarget: Element | null = null;
    let quirkTimer = 0;

    const personality = createPersonality({
      root,
      hands,
      react: (expression) => {
        if (expression) setReason("interaction", expression);
        else clearReason("interaction");
      },
      move,
      stopMotion: () => {
        bodyAnimation?.cancel();
        bodyAnimation = undefined;
      },
      available: () =>
        !disposed &&
        onScreen &&
        !document.hidden &&
        !eyeOverride() &&
        (activityRef.current === "idle" || activityRef.current === "walking") &&
        !["grumpy", "worried", "skeptical", "asleep"].includes(current),
    });

    // ---------- Expressão e olhar ----------

    function setReason(reason: Reason, expression: Expression, durationMs?: number) {
      reasons.set(reason, expression, durationMs);
      update();
    }

    function clearReason(reason: Reason) {
      if (reasons.delete(reason)) update();
    }

    /** Senha escondida: olhos fechados. Mostrando: espia com um olho só (mas não dormindo). */
    function eyeOverride(): readonly [number, number] | undefined {
      const field = focusedPasswordField();
      if (!field || current === "asleep") return undefined;
      return field.type === "password" ? [1, 1] : [1, 0];
    }

    function currentAttention() {
      return attention && performance.now() < attention.until ? attention.element : undefined;
    }

    /** Agenda uma reavaliação pro próximo motivo que vai vencer. */
    function scheduleReasonExpiry() {
      window.clearTimeout(reasonTimer);
      const next = reasons.nextExpiry();
      if (Number.isFinite(next)) {
        reasonTimer = window.setTimeout(update, Math.max(0, next - performance.now()) + 16);
      }
    }

    // ---------- Animação ----------

    function step(time: number) {
      if (disposed || document.hidden || !onScreen) {
        frame = 0;
        return;
      }
      // O horário do rAF é o do início do quadro e pode vir antes do lastTime: nunca negativo.
      const dt = Math.min(Math.max(0, (time - lastTime) / 1000), 1 / 30);
      lastTime = time;
      const waiting = current === "waiting";
      const listening = current === "listening";
      if (waiting) {
        const x = Math.sin(time / 1100) * 0.55;
        gazeTarget = { ...IDLE, x, leftX: x, rightX: x };
      }
      if (listening) {
        const voice = voiceAmount(voiceRef.current?.current ?? 0);
        faceTarget = { ...faceTarget, tilt: -4 + voice * 7, pupil: 1 + voice * 0.05 };
        root.style.setProperty("--voice", voice.toFixed(3));
      } else root.style.setProperty("--voice", "0");
      const gazeSettled = springStep(gaze, gazeVelocity, gazeTarget, GAZE_RESPONSE, dt);
      const faceSettled = springStep(
        faceState,
        faceVelocity,
        faceTarget,
        (key) =>
          (current === "sleepy" || current === "asleep") &&
          (key === "rest" || key === "tilt" || key === "lid0" || key === "lid1")
            ? 0.85
            : FACE_RESPONSE,
        dt,
      );
      // O horário do rAF pode vir antes do blinkStarted: conta como início, sem descartar a piscada.
      const progress = blinkStarted ? Math.max(0, (time - blinkStarted) / 180) : 1;
      const blinking = progress < 1;
      if (!blinking) blinkStarted = 0;
      const lid = blinking ? Math.sin(progress * Math.PI) ** 2 : 0;
      renderer.render(gaze, {
        ...faceState,
        lid0: Math.max(lid, faceState.lid0),
        lid1: Math.max(lid, faceState.lid1),
      });
      frame =
        gazeSettled && faceSettled && !blinking && !waiting && !listening
          ? 0
          : requestAnimationFrame(step);
    }

    /** Recalcula expressão e olhar e anima até eles (ou pula direto, com movimento reduzido). */
    function update() {
      if (disposed) return;
      const previous = current;
      current = reasons.current(baseRef.current);
      if (previous === "presenting" && current !== "presenting") hands.cancel();
      root.dataset.expression = current;
      root.dataset.motion = document.hidden || !onScreen ? "paused" : "active";
      scheduleReasonExpiry();
      gazeTarget =
        current === "sleepy" || current === "asleep"
          ? IDLE
          : gazeFor(
              face,
              currentAttention() ??
                (current === "greeting" || current === "walking"
                  ? [
                      ...(root
                        .closest("[data-mascot-pair]")
                        ?.querySelectorAll("[data-slot=mascot]") ?? []),
                    ].find((other) => other !== root)
                  : current === "presenting"
                    ? (document.querySelector("[data-mascot-stage]") ?? undefined)
                    : undefined),
              pointer,
            );
      faceTarget = toFaceState(EXPRESSIONS[current], eyeOverride());
      // A pose fechada tem prioridade sobre um aceno iniciado antes do foco na senha.
      if (eyeOverride() || current === "sleepy" || current === "asleep") hands.cancel();
      if (
        personality.active &&
        (eyeOverride() ||
          current === "asleep" ||
          current === "grumpy" ||
          current === "worried" ||
          current === "skeptical")
      ) {
        personality.cancel();
      }
      // Une pose sustentada à atenção no palco; a rotina de mão não cobre olhos de senha.
      if (current === "presenting" && !eyeOverride() && !reducedMotion()) hands.hold();
      if (eyeOverride() || current === "asleep" || reducedMotion()) blinkStarted = 0;

      if (reducedMotion()) {
        cancelAnimationFrame(frame);
        frame = 0;
        root.getAnimations().forEach((animation) => animation.cancel());
        hands.cancel();
        renderer.lids.forEach((lid) =>
          lid.getAnimations().forEach((animation) => animation.cancel()),
        );
        Object.assign(gaze, gazeTarget);
        Object.assign(faceState, faceTarget);
        Object.assign(gazeVelocity, IDLE);
        Object.assign(faceVelocity, ZERO_FACE);
        renderer.render(gaze, faceState);
        return;
      }
      if (document.hidden || !onScreen) return;
      if (!frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(step);
      }
    }

    /**
     * Pra eventos frequentes (mouse, seleção, rolagem): recalcula uma vez por quadro, em vez de
     * medir a tela a cada evento.
     */
    function requestUpdate() {
      // Fora da tela (rolou a página): não mede nem anima a cada movimento do mouse. O ponteiro
      // continua sendo guardado, e o olhar se acerta ao voltar a aparecer.
      if (disposed || queuedUpdate || !onScreen) return;
      queuedUpdate = requestAnimationFrame(() => {
        queuedUpdate = 0;
        update();
      });
    }

    /** Movimento do corpo inteiro; desligado com movimento reduzido. */
    function move({
      keyframes,
      options,
    }: {
      keyframes: Keyframe[];
      options: KeyframeAnimationOptions;
    }) {
      bodyAnimation?.cancel();
      bodyAnimation = undefined;
      if (reducedMotion() || document.hidden || !onScreen) return undefined;
      bodyAnimation = root.animate(keyframes, options);
      return bodyAnimation;
    }

    function blink() {
      if (
        !reducedMotion() &&
        !document.hidden &&
        onScreen &&
        current !== "asleep" &&
        current !== "sleepy" &&
        current !== "grumpy" &&
        current !== "worried" &&
        !eyeOverride()
      ) {
        blinkStarted = performance.now();
        update();
      }
      blinkTimer = window.setTimeout(blink, 2500 + Math.random() * 3500);
    }

    // ---------- Avisos do sistema (events.ts) ----------

    function lookAtFor(element: Element) {
      attention = { element, until: performance.now() + ATTENTION_MS };
      window.clearTimeout(attentionTimer);
      attentionTimer = window.setTimeout(() => {
        attention = null;
        update();
      }, ATTENTION_MS + 16);
    }

    function onSignal(signal: MascotSignal) {
      onActivity();
      personality.cancel();
      switch (signal.type) {
        case "celebrate":
          reasons.delete("error");
          setReason("celebrate", "celebrate", CELEBRATE_MS);
          move(JUMP);
          hands.wave(true);
          break;
        case "upset":
          reasons.delete("celebrate");
          reasons.delete("typing");
          reasons.delete("tap");
          hands.cancel();
          bodyAnimation?.cancel();
          if (signal.target) lookAtFor(signal.target);
          setReason("error", signal.mood, UPSET_MS);
          if (signal.mood === "grumpy") move(SHAKE);
          break;
        case "doubt":
          if (signal.active) setReason("doubt", "skeptical");
          else clearReason("doubt");
          break;
        case "nod":
          move(NOD);
          hands.wave();
          break;
      }
    }

    // ---------- Sono ----------

    function resetIdleTimer() {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
      if (!canSleepRef.current || activityRef.current !== "idle" || document.hidden || !onScreen)
        return;
      const { expression, nextIn } = idleSleep(lastActivity, performance.now());
      const previous = sleepStage;
      sleepStage = expression;
      if (expression) {
        setReason("sleep", expression);
        if (expression === "sleepy" && previous !== "sleepy") personality.yawn();
        if (expression === "asleep") personality.cancel();
      } else clearReason("sleep");
      if (Number.isFinite(nextIn)) idleTimer = window.setTimeout(resetIdleTimer, nextIn);
    }

    /** Acorda sem manter uma expressão sonolenta durante a próxima interação. */
    function onActivity() {
      lastActivity = performance.now();
      if (reasons.delete("sleep")) {
        sleepStage = null;
        personality.cancel();
        update();
        personality.stretch();
      }
      // O timer consulta a atividade mais recente ao disparar; não o recria a cada pixel do mouse.
      if (!idleTimer) resetIdleTimer();
    }

    // ---------- Eventos da página ----------

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer = { x: event.clientX, y: event.clientY };
      onActivity();
      const control =
        event.target instanceof Element
          ? event.target.closest("button, a[href], [role=button]")
          : null;
      const next = control && !root.contains(control) ? control : null;
      if (next !== curiosityTarget) {
        curiosityTarget = next;
        if (next && activityRef.current === "idle") setReason("curiosity", "curious");
        else clearReason("curiosity");
      }
      requestUpdate();
    };
    const resetPointer = () => {
      pointer = null;
      curiosityTarget = null;
      clearReason("curiosity");
      requestUpdate();
    };
    // Ao sair da janela, volta a olhar para a frente (ou para o campo com foco).
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null && event.pointerType !== "touch") resetPointer();
    };
    // Rolar muda a posição de tudo na tela: o olhar precisa acompanhar.
    const onScroll = () => {
      onActivity();
      requestUpdate();
    };
    // O foco só muda depois do focusout; espera o próximo ciclo pra ler o elemento ativo.
    const onFocusChange = (event: FocusEvent) => {
      pointer = null;
      onActivity();
      if (
        event.type === "focusin" &&
        event.target instanceof HTMLElement &&
        root.contains(event.target) &&
        event.target.dataset.mascotAction === "high-five"
      ) {
        personality.offerHighFive(true);
      }
      if (event.type === "focusout") clearReason("capsLock");
      requestUpdate();
    };
    const onInput = (event: Event) => {
      pointer = null;
      onActivity();
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return update();
      }
      // Digitando: fica feliz e "perdoa" o erro anterior.
      reasons.delete("error");
      setReason("typing", "happy", HAPPY_AFTER_TYPING_MS);
    };
    const onKey = (event: Event) => {
      pointer = null;
      onActivity();
      // O preenchimento automático do navegador dispara "keydown"/"keyup" que não são eventos
      // de teclado de verdade (sem getModifierState): esses não dizem nada sobre o Caps Lock.
      if (!(event instanceof KeyboardEvent) || !(event.target instanceof HTMLInputElement)) return;
      // Caps Lock ligado num campo: olhos arregalados, reforçando o aviso da tela.
      if (event.getModifierState("CapsLock")) setReason("capsLock", "surprised");
      else clearReason("capsLock");
    };

    // Tocar no mascote: encolhe no toque e ri ao soltar em cima dele (arrastar pra fora desfaz).
    const onPress = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (!(event.target instanceof Element) || !event.target.closest("[data-mascot-action]"))
        return;
      hands.cancel();
      pressAnimation?.cancel();
      pressAnimation = move(PRESS);
    };
    const onCancelPress = () => {
      pressAnimation?.cancel();
      pressAnimation = undefined;
    };
    const onClick = (event: MouseEvent) => {
      const action =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-mascot-action]")?.dataset.mascotAction
          : undefined;
      onCancelPress();
      onActivity();
      if (action === "pet") personality.pet();
      else if (action === "high-five") personality.highFive();
    };

    let lastGreeting = -Infinity;
    const onEnter = () => {
      onActivity();
      if (activityRef.current !== "idle" || personality.active) return;
      if (current === "grumpy" || current === "worried") return;
      if (!onScreen || document.hidden || performance.now() - lastGreeting < 2500) return;
      lastGreeting = performance.now();
      if (!personality.offerHighFive()) hands.wave();
    };

    // O primeiro aceno acontece quando todas as camadas estão visíveis.
    const images = [...root.querySelectorAll("img")];
    let greeted = false;
    const greetWhenReady = () => {
      if (disposed || greeted || !images.every((image) => image.complete && image.naturalWidth > 0))
        return;
      greeted = true;
      if (current !== "asleep" && current !== "sleepy") onEnter();
    };
    images.forEach((image) => image.addEventListener("load", greetWhenReady));

    // Pausa animações fora da tela ou com a aba escondida.
    const pauseMotion = () => {
      root.dataset.motion = "paused";
      cancelAnimationFrame(frame);
      cancelAnimationFrame(queuedUpdate);
      frame = queuedUpdate = blinkStarted = 0;
      onCancelPress();
      bodyAnimation?.cancel();
      personality.cancel();
      hands.cancel();
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    };
    const onVisibilityChange = () => {
      if (document.hidden) pauseMotion();
      else {
        onActivity();
        update();
      }
    };

    // O campo de senha troca de tipo ao "Mostrar senha": os olhos precisam acompanhar.
    const typeObserver = new MutationObserver(requestUpdate);
    typeObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["type"],
    });

    const stopSignals = onMascotSignal(onSignal);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("blur", resetPointer);
    window.addEventListener("focus", onActivity);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", requestUpdate);
    motionPreference.addEventListener("change", requestUpdate);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    document.addEventListener("selectionchange", requestUpdate);
    document.addEventListener("visibilitychange", onVisibilityChange);
    root.addEventListener("pointerdown", onPress);
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("click", onClick);
    root.addEventListener("pointerup", onCancelPress);
    root.addEventListener("pointerleave", onCancelPress);
    root.addEventListener("pointercancel", onCancelPress);
    blinkTimer = window.setTimeout(blink, 2000);
    resetIdleTimer();
    update();
    updateRef.current = update;
    // Desligado no meio do cochilo: acorda na hora (sem pálpebra lenta) e não volta a dormir.
    resetSleepRef.current = () => {
      if (!canSleepRef.current && reasons.delete("sleep")) update();
      lastActivity = performance.now();
      resetIdleTimer();
    };

    const syncContext = () => {
      personality.cancel();
      const nextActivity = activityRef.current;
      if (nextActivity === "idle") clearReason("context");
      else {
        reasons.delete("sleep");
        sleepStage = null;
        reasons.delete("curiosity");
        setReason("context", nextActivity);
      }
      update();
      resetIdleTimer();
    };
    contextChangedRef.current = syncContext;
    syncContext();
    greetWhenReady();

    const occasionalQuirk = () => {
      if (
        !disposed &&
        !reducedMotion() &&
        !personality.active &&
        ["neutral", "happy", "curious"].includes(current) &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      )
        personality.sneeze();
      quirkTimer = window.setTimeout(occasionalQuirk, 65_000 + Math.random() * 25_000);
    };
    quirkTimer = window.setTimeout(occasionalQuirk, 18_000 + Math.random() * 5000);

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      if (onScreen) {
        onActivity();
        update();
      } else pauseMotion();
    });
    visibility.observe(root);

    return () => {
      disposed = true;
      updateRef.current = undefined;
      resetSleepRef.current = undefined;
      contextChangedRef.current = undefined;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(queuedUpdate);
      root.getAnimations().forEach((animation) => animation.cancel());
      hands.cancel();
      personality.cancel();
      images.forEach((image) => image.removeEventListener("load", greetWhenReady));
      renderer.lids.forEach((lid) =>
        lid.getAnimations().forEach((animation) => animation.cancel()),
      );
      for (const timer of [blinkTimer, attentionTimer, reasonTimer, idleTimer, quirkTimer]) {
        window.clearTimeout(timer);
      }
      typeObserver.disconnect();
      visibility.disconnect();
      stopSignals();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", resetPointer);
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", requestUpdate);
      motionPreference.removeEventListener("change", requestUpdate);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
      document.removeEventListener("input", onInput);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("selectionchange", requestUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.removeEventListener("pointerdown", onPress);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerup", onCancelPress);
      root.removeEventListener("pointerleave", onCancelPress);
      root.removeEventListener("pointercancel", onCancelPress);
    };
  }, [rootRef, faceRef]);
}
