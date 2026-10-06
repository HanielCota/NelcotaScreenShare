import { useEffect, useRef, type RefObject } from "react";
import { createFaceRenderer } from "@/features/mascot/dom/face-renderer";
import { createMascotController } from "@/features/mascot/dom/mascot-controller";
import type { Expression } from "@/features/mascot/engine/face";
import type { MascotActivity } from "@/features/mascot/engine/personality";

type Controller = ReturnType<typeof createMascotController>;

/**
 * Liga o mascote ao React. O comportamento todo fica no controlador
 * (dom/mascot-controller.ts); aqui só se monta, desmonta e repassa as props.
 * As props vão por referência: mudar a atividade ou a expressão de repouso não
 * desmonta nada (sono, erro, olhar), só pede um recálculo.
 */
export function useMascot(
  rootRef: RefObject<HTMLDivElement | null>,
  faceRef: RefObject<HTMLDivElement | null>,
  baseExpression: Expression,
  canSleep: boolean,
  activity: MascotActivity,
  voiceLevelRef?: RefObject<number>,
) {
  const props = useRef({ baseExpression, canSleep, activity, voiceLevelRef });
  const controller = useRef<Controller | undefined>(undefined);

  useEffect(() => {
    props.current.activity = activity;
    props.current.voiceLevelRef = voiceLevelRef;
    controller.current?.syncContext();
  }, [activity, voiceLevelRef]);

  useEffect(() => {
    props.current.baseExpression = baseExpression;
    controller.current?.update();
  }, [baseExpression]);

  useEffect(() => {
    props.current.canSleep = canSleep;
    controller.current?.resetSleep();
  }, [canSleep]);

  useEffect(() => {
    const root = rootRef.current;
    const face = faceRef.current;
    const renderer = face && createFaceRenderer(face);
    if (!root || !face || !renderer) return;
    const created = createMascotController(root, face, renderer, {
      base: () => props.current.baseExpression,
      canSleep: () => props.current.canSleep,
      activity: () => props.current.activity,
      voice: () => props.current.voiceLevelRef?.current ?? 0,
    });
    controller.current = created;
    return () => {
      controller.current = undefined;
      created.dispose();
    };
  }, [rootRef, faceRef]);
}
