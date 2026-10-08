import { useRef, type ReactNode } from "react";
import { gsap } from "@/lib/animation/gsap";
import { MOTION_QUERIES } from "@/lib/animation/motion";
import { useScrollScene } from "@/lib/animation/scroll-scene";
import { BugArt, PairingArt, ReviewArt } from "./UseCaseArt";

const CASES: { title: string; text: string; uses: string; art: ReactNode }[] = [
  {
    title: "Mostrar um bug.",
    text: "Reproduza o erro ao vivo, com o som do computador junto, enquanto o time vê exatamente o que você vê. Sem gravar vídeo e sem “aqui funciona”.",
    uses: "Som do computador · Tela, janela ou aba",
    art: <BugArt />,
  },
  {
    title: "Revisar uma tela.",
    text: "Design e produto apontam direto no que querem mudar, com o ponteiro na tela de quem apresenta. Cada um vê o nome de quem está apontando.",
    uses: "Ponteiro compartilhado · Reações e mão levantada",
    art: <ReviewArt />,
  },
  {
    title: "Parear num problema.",
    text: "Uma pessoa conduz e a outra acompanha numa janela flutuante por cima do editor, sem ficar trocando de aba.",
    uses: "Janela flutuante · Atalhos de teclado",
    art: <PairingArt />,
  },
];

/** Wide screens with motion: the track slides sideways while the section is pinned. */
const SIDEWAYS = `${MOTION_QUERIES.motion} and (min-width: 768px)`;

/**
 * The three moments the product is built for. On wide screens the panels slide by
 * horizontally as you scroll; on phones and without motion they stack.
 */
export function UseCasesScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(
    scope,
    (section) => {
      const track = section.querySelector<HTMLElement>("[data-cases-track]");
      if (!track) return;
      // Only now the panels line up in a row; otherwise they stay stacked and readable.
      gsap.set(section, { attr: { "data-scene": "live" } });
      const distance = () => track.scrollWidth - document.documentElement.clientWidth;
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    SIDEWAYS,
  );

  return (
    <section
      ref={scope}
      id="para-times"
      aria-labelledby="use-cases-title"
      className="group/scene w-full overflow-hidden"
    >
      <div className="flex min-h-svh flex-col justify-center gap-12 py-24">
        <h2
          id="use-cases-title"
          className="page-column text-[clamp(2.25rem,6vw,5rem)] leading-[1] font-semibold tracking-[-0.045em]"
        >
          Feito para o dia a dia
          <br />
          <span className="text-ink-subtle">do seu time.</span>
        </h2>
        <ol
          data-cases-track
          className="page-column flex flex-col gap-16 group-data-[scene=live]/scene:mx-0 group-data-[scene=live]/scene:w-max group-data-[scene=live]/scene:flex-row group-data-[scene=live]/scene:gap-8 group-data-[scene=live]/scene:px-[max(1.5rem,calc((100%-64rem)/2))]"
        >
          {CASES.map(({ title, text, uses, art }, index) => (
            <li
              key={title}
              className="flex flex-col gap-6 group-data-[scene=live]/scene:w-[min(44rem,72vw)] md:flex-row md:items-center md:gap-10"
            >
              <div className="md:w-1/2">{art}</div>
              <div className="flex flex-col gap-3 md:w-1/2">
                <span className="text-sm font-medium text-ink-subtle tabular-nums">
                  0{index + 1}
                </span>
                <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.04em]">
                  {title}
                </h3>
                <p className="text-base leading-relaxed text-pretty text-ink-muted">{text}</p>
                <p className="text-sm font-medium text-brand-soft">{uses}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
