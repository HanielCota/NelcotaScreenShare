import { useRef } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";
import { SplitText } from "@/lib/animation/gsap-scroll";

/**
 * One idea in big type. While the stage is pinned, the words light up in reading order,
 * driven by the scroll; without motion the paragraph is simply there.
 */
export function ManifestoScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const text = section.querySelector<HTMLElement>("[data-manifesto]");
    if (!text) return;
    const split = SplitText.create(text, { type: "words", aria: "auto" });
    gsap.fromTo(
      split.words,
      { opacity: 0.16 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=180%",
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
        },
      },
    );
    return () => split.revert();
  });

  return (
    <section ref={scope} aria-label="Por que o Nelcota existe" className="stage w-full">
      <div className="mx-auto flex min-h-svh max-w-5xl items-center px-4 py-24 sm:px-8">
        <p
          data-manifesto
          className="text-[clamp(1.75rem,4.4vw,3.75rem)] leading-[1.12] font-semibold tracking-[-0.035em] text-balance"
        >
          Explicar algo no computador não devia começar com “tá vendo minha tela?”. Abra a sala,
          mande o link e mostre. <span className="text-brand">O som vai junto</span>, o ponteiro
          mostra onde clicar e ninguém precisa instalar nada.
        </p>
      </div>
    </section>
  );
}
