import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

const NOT_KEPT = ["Áudio.", "Vídeo.", "Telas.", "Chat."];

/**
 * Privacy as a scene: what passes through a call fades away word by word while the stage is
 * pinned, and the promise is left on screen. Without motion every line stays visible.
 */
export function PrivacyScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const q = gsap.utils.selector(section);
    const tl = gsap.timeline({
      defaults: { ease: "power1.in", duration: 1 },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=220%",
        pin: q("[data-privacy-frame]")[0],
        scrub: 0.5,
        anticipatePin: 1,
      },
    });
    // The words fade out one by one, then the promise takes their place.
    tl.to(
      q("[data-privacy-word]"),
      { autoAlpha: 0, filter: "blur(14px)", y: -12, stagger: 0.7 },
      0.3,
    )
      .from(q("[data-privacy-promise]"), { autoAlpha: 0, y: 40, duration: 0.8 }, ">-0.5")
      .from(q("[data-privacy-detail]"), { autoAlpha: 0, y: 24, duration: 0.8 }, ">-0.4")
      .to({}, { duration: 0.4 });
  });

  return (
    <section ref={scope} aria-labelledby="privacy-title" className="stage w-full">
      <div
        data-privacy-frame
        className="mx-auto flex min-h-svh max-w-5xl flex-col justify-center gap-10 px-4 pt-28 pb-16 sm:px-8"
      >
        <ul
          aria-label="O que passa pela chamada"
          className="flex flex-col text-[clamp(2.75rem,9vw,7.5rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-(--stage-muted)"
        >
          {NOT_KEPT.map((word) => (
            <li key={word} data-privacy-word>
              {word}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4">
          <h2
            id="privacy-title"
            data-privacy-promise
            className="text-[clamp(2rem,5vw,4rem)] leading-[1.02] font-semibold tracking-[-0.045em]"
          >
            Nada disso fica gravado.
          </h2>
          <div data-privacy-detail className="flex max-w-xl flex-col gap-4">
            <p className="text-lg text-pretty text-(--stage-muted) sm:text-xl">
              Tudo passa ao vivo e some quando a sala acaba. Você baixa ou apaga os seus dados
              quando quiser, como manda a LGPD.
            </p>
            <Link
              viewTransition
              to="/privacidade"
              className="inline-flex w-fit items-center gap-1.5 text-base font-medium text-brand underline-offset-4 hover:underline"
            >
              Leia o aviso de privacidade
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
