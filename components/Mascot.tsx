"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import atlas from "@/public/mascot/nelcota-mint-atlas.png";
import { avatarFrame } from "./mascot/avatar-frames";
import type { Expression } from "./mascot/face";
import { useMascot } from "./mascot/use-mascot";
import { SpriteEyes } from "./mascot/SpriteEyes";
import styles from "./Mascot.module.css";

interface MascotProps {
  className?: string;
  expression?: Expression;
  canSleep?: boolean;
  sizes?: string;
}

/** Poses do mascote verde-menta preservam a arte aprovada em todas as reações. */
export function Mascot({
  className,
  expression = "neutral",
  canSleep = true,
  sizes = "(min-width: 640px) 624px, 528px",
}: MascotProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const [initialPose] = useState(() => avatarFrame(expression));
  useMascot(rootRef, faceRef, expression, canSleep);

  return (
    <div
      ref={rootRef}
      data-slot="mascot"
      data-expression={expression}
      aria-hidden="true"
      className={cn(
        "relative shrink-0 touch-manipulation [forced-color-adjust:none] select-none",
        styles.root,
        className,
      )}
    >
      <div
        ref={faceRef}
        data-slot="mascot-face"
        className="absolute inset-0"
        style={
          {
            "--sprite-column": initialPose.column,
            "--sprite-row": initialPose.row,
            "--tilt": 0,
            "--rest": 0,
            transform:
              "translateY(calc(var(--rest) * 2%)) rotate(calc(var(--tilt) * 1deg)) scale(calc(1 + var(--rest) * 0.055), calc(1 - var(--rest) * 0.14))",
            transformOrigin: "50% 85%",
          } as CSSProperties
        }
      >
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
            <Image
              src={atlas}
              alt=""
              sizes={sizes}
              loading="eager"
              draggable={false}
              className="absolute inset-0 size-full"
            />
            <SpriteEyes />
          </div>
        </div>
      </div>
      <span className={styles.dreams} data-mascot-dreams="">
        <span>Z</span>
        <span>z</span>
        <span>z</span>
      </span>
    </div>
  );
}
