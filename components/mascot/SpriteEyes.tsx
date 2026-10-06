import { useId } from "react";
import { EYE_ANGLE, EYE_SHAPES, POSE_EYES, eyelidOffset } from "./eye-tracking";

/** Camada vetorial sobre os olhos fixos, movida junto com cada quadro do atlas. */
export function SpriteEyes() {
  const id = useId();

  return (
    <svg
      viewBox="0 0 1536 1024"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    >
      {POSE_EYES.flatMap((eyes, pose) =>
        eyes.map((eye, index) => {
          const clipId = `${id}-eye-${pose}-${index}`;
          const { rx, ry, pupilRx, pupilRy } = EYE_SHAPES[index]!;
          return (
            <g key={clipId} transform={`translate(${eye.x} ${eye.y}) rotate(${EYE_ANGLE})`}>
              <defs>
                <clipPath id={clipId}>
                  <ellipse rx={rx} ry={ry} />
                </clipPath>
              </defs>
              <ellipse rx={rx} ry={ry} fill="#fcfaef" />
              <g clipPath={`url(#${clipId})`}>
                <ellipse
                  data-mascot-pupil=""
                  data-mascot-eye={index}
                  rx={pupilRx}
                  ry={pupilRy}
                  fill="#231f19"
                />
                <g
                  data-mascot-lid=""
                  data-mascot-eye={index}
                  transform={`translate(0 ${eyelidOffset(ry, 0)})`}
                  visibility="hidden"
                >
                  <rect x={-rx} y={-ry} width={2 * rx} height={2 * ry} fill="#a2e1b2" />
                  <path
                    d={`M${-rx} ${ry} Q0 ${ry + 5} ${rx} ${ry}`}
                    fill="none"
                    stroke="#74b98b"
                    strokeWidth="2.5"
                  />
                </g>
              </g>
            </g>
          );
        }),
      )}
    </svg>
  );
}
