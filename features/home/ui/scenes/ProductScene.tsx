import { useRef } from "react";
import { useProductScene } from "@/features/home/hooks/use-product-scene";
import { useStageHeader } from "@/features/home/hooks/use-stage-header";
import { DemoWindow } from "../demo/DemoWindow";

const PRODUCT_CHAPTERS = [
  { title: "Mostre qualquer tela.", text: "A tela inteira, uma janela ou só uma aba." },
  { title: "Com o som junto.", text: "O vídeo, a música ou aquele bug barulhento." },
  { title: "Aponte onde importa.", text: "O ponteiro aparece para todo mundo, com o seu nome." },
  { title: "E chame quem precisar.", text: "Quem recebe o link entra sem criar conta." },
] as const;

/**
 * The product, told by scrolling: the room window rises onto a dark stage and stays pinned
 * while four chapters play on it. Without motion it is the window under the list of chapters.
 */
export function ProductScene() {
  const scope = useRef<HTMLElement>(null);
  useProductScene(scope);
  useStageHeader(scope);

  return (
    <section
      ref={scope}
      aria-labelledby="product-title"
      className="group/scene stage relative w-full scroll-mt-0"
    >
      <h2 id="product-title" className="sr-only">
        Como é uma sala do Nelcota
      </h2>
      <div
        data-scene-frame
        className="mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 pt-24 pb-8 sm:gap-8 sm:px-8"
      >
        <ol className="relative flex w-full flex-col gap-6 text-center group-data-[scene=live]/scene:h-[7.5rem] sm:group-data-[scene=live]/scene:h-[9rem]">
          {PRODUCT_CHAPTERS.map(({ title, text }) => (
            <li
              key={title}
              data-chapter
              className="flex flex-col gap-2 group-data-[scene=live]/scene:absolute group-data-[scene=live]/scene:inset-x-0 group-data-[scene=live]/scene:top-0"
            >
              <span className="text-[clamp(2rem,5.5vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">
                {title}
              </span>
              <span className="text-base text-pretty text-(--stage-muted) sm:text-xl">{text}</span>
            </li>
          ))}
        </ol>

        <div
          data-scene-window
          className="w-[min(100%,58rem,calc((100svh-24rem)*1.4))] will-change-transform"
        >
          <DemoWindow />
        </div>

        <div aria-hidden="true" className="hidden gap-2 group-data-[scene=live]/scene:flex">
          {PRODUCT_CHAPTERS.map(({ title }) => (
            <span key={title} className="h-1 w-8 overflow-hidden rounded-full bg-(--stage-dim)">
              <span data-chapter-progress className="block h-full origin-left scale-x-0 bg-white" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
