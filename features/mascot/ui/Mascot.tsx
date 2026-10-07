import { Hint } from "@/components/Hint";

import { useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import { cn } from "@/lib/utils";
const atlas = "/mascot/nelcota-mint-atlas.png";
import { avatarFrame } from "@/features/mascot/domain/avatar-frames";
import type { Expression } from "@/features/mascot/domain/face";
import { useMascot } from "../hooks/use-mascot";
import { SpriteEyes } from "./SpriteEyes";
import styles from "./Mascot.module.css";
import type { MascotActivity } from "@/features/mascot/domain/personality";

interface MascotProps {
  className?: string;
  expression?: Expression;
  canSleep?: boolean;
  sizes?: string;
  activity?: MascotActivity;
  voiceLevelRef?: RefObject<number>;
  /**
   * Para que lado ele fica virado. A arte original olha para a esquerda;
   * "right" espelha só o desenho (o olhar e o "Zzz" continuam certos).
   */
  facing?: "left" | "right";
}

/** Poses do mascote verde-menta preservam a arte aprovada em todas as reações. */
export function Mascot({
  className,
  expression = "neutral",
  canSleep = true,
  sizes = "(min-width: 640px) 624px, 528px",
  facing = "left",
  activity = "idle",
  voiceLevelRef,
}: MascotProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const footClipId = useId();
  const [initialPose] = useState(() => avatarFrame(expression));
  useMascot(rootRef, faceRef, expression, canSleep, activity, voiceLevelRef, facing);
  const faceStyle: CSSProperties & Record<`--${string}`, string | number> = {
    "--sprite-column": initialPose.column,
    "--sprite-row": initialPose.row,
    "--tilt": 0,
    "--rest": 0,
    transform:
      "translateY(calc(var(--rest) * 2%)) rotate(calc(var(--tilt) * 1deg)) scale(calc(1 + var(--rest) * 0.055), calc(1 - var(--rest) * 0.14))",
    transformOrigin: "50% 85%",
  };

  return (
    <div
      ref={rootRef}
      data-slot="mascot"
      data-expression={expression}
      data-facing={facing}
      className={cn(
        "relative shrink-0 touch-manipulation [forced-color-adjust:none] select-none",
        styles.root,
        className,
      )}
    >
      {/* Espelho fora do rosto: inclinação e olhar (refletido em gaze.ts) seguem consistentes. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={facing === "right" ? { transform: "scaleX(-1)" } : undefined}
      >
        <div ref={faceRef} data-slot="mascot-face" className="absolute inset-0" style={faceStyle}>
          {/* Recortes da própria arte, atrás do corpo: o encaixe da perna fica escondido ao levantar o pé. */}
          <svg aria-hidden="true" viewBox="0 0 512 512" className={styles.walkingFeet}>
            <defs>
              <clipPath id={`${footClipId}-left`}>
                <path d="M170 430h102v70H170z" />
              </clipPath>
              <clipPath id={`${footClipId}-right`}>
                <path d="M272 430h110v70H272z" />
              </clipPath>
            </defs>
            <g className={styles.leftFoot} data-mascot-walking-foot="left">
              <image
                href={atlas}
                width="1536"
                height="1024"
                clipPath={`url(#${footClipId}-left)`}
              />
            </g>
            <g className={styles.rightFoot} data-mascot-walking-foot="right">
              <image
                href={atlas}
                width="1536"
                height="1024"
                clipPath={`url(#${footClipId}-right)`}
              />
            </g>
          </svg>
          <div className={cn("absolute inset-0 overflow-hidden", styles.body)}>
            <div
              data-mascot-sprite=""
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "300%",
                height: "200%",
                maxWidth: "none",
                transform:
                  "translate(calc(var(--sprite-column) * -33.333333%), calc(var(--sprite-row) * -50%))",
              }}
            >
              <img
                src={atlas}
                alt=""
                sizes={sizes}
                loading="eager"
                draggable={false}
                className="absolute inset-0 size-full"
              />
              <SpriteEyes />
            </div>
            <svg viewBox="0 0 512 512" className={styles.foot}>
              <path d="M184 472 Q179 486 207 486 L235 486 Q241 480 235 474" fill="#78bd90" />
            </svg>
          </div>
        </div>
      </div>
      <Hint text="Fazer carinho">
        <button
          type="button"
          // Brincadeira de mouse e toque: fora da ordem do Tab, para não ficar
          // entre a pessoa e o campo principal da página.
          tabIndex={-1}
          disabled={activity !== "idle" && activity !== "walking"}
          data-mascot-action="pet"
          aria-label="Fazer carinho no Nelcota"
          className={styles.petTarget}
        />
      </Hint>
      <Hint text="Toca aqui!">
        <button
          type="button"
          // Brincadeira de mouse e toque: fora da ordem do Tab, para não ficar
          // entre a pessoa e o campo principal da página.
          tabIndex={-1}
          disabled={activity !== "idle" && activity !== "walking"}
          data-mascot-action="high-five"
          aria-label="Toca aqui com o Nelcota"
          className={styles.handTarget}
        />
      </Hint>
      <span aria-hidden="true" className={styles.invitation}>
        Toca aqui!
      </span>
      <svg aria-hidden="true" viewBox="0 0 100 100" className={styles.effects}>
        <path className={styles.heart} d="M50 20 C40 8 27 21 50 36 C73 21 60 8 50 20" />
        <g className={styles.spark}>
          <path d="M15 37v-8m-7 5-6-4m16 17-9 2" />
          <path d="m70 56 7-2m-3 9 6 5" />
        </g>
      </svg>
      <span aria-hidden="true" className={styles.dreams} data-mascot-dreams="">
        <span>Z</span>
        <span>z</span>
        <span>z</span>
      </span>
    </div>
  );
}
