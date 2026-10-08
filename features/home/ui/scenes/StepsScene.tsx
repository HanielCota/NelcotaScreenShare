import { useRef } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

const STEPS = [
  {
    title: "Crie a sala.",
    text: "Aperte Enter na barra lá em cima. A sala nasce na hora, com um link só dela.",
  },
  {
    title: "Mande o link.",
    text: "No chat do time, no e-mail ou no WhatsApp. Quem recebe entra pelo navegador, sem criar conta.",
  },
  {
    title: "Compartilhe.",
    text: "A tela inteira, uma janela ou só uma aba, com o som do computador se quiser.",
  },
];

/**
 * "How it works" as a pinned counter: a giant step number rolls like an odometer while the
 * step beside it changes. Without motion it is a plain numbered list.
 */
export function StepsScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const q = gsap.utils.selector(section);
    const steps = q("[data-step]");
    gsap.set(section, { attr: { "data-scene": "live" } });
    const tl = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.inOut" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=200%",
        pin: q("[data-steps-frame]")[0],
        scrub: 0.5,
        anticipatePin: 1,
      },
    });
    tl.set(steps, { autoAlpha: 0, y: 32 }).set(steps[0] ?? [], { autoAlpha: 1, y: 0 });
    for (let index = 1; index < steps.length; index++) {
      const at = index;
      tl.to(q("[data-step-digits]"), { yPercent: (-100 * index) / STEPS.length }, at)
        .to(steps[index - 1] ?? [], { autoAlpha: 0, y: -32, duration: 0.25 }, at)
        .to(steps[index] ?? [], { autoAlpha: 1, y: 0 }, at + 0.3);
    }
    tl.to({}, { duration: 0.6 });
  });

  return (
    <section
      ref={scope}
      id="como-funciona"
      aria-labelledby="steps-title"
      className="group/scene w-full scroll-mt-0"
    >
      <div
        data-steps-frame
        className="page-column flex flex-col justify-center gap-10 py-24 group-data-[scene=live]/scene:min-h-svh"
      >
        <h2
          id="steps-title"
          className="text-[clamp(2.25rem,6vw,5rem)] leading-[1] font-semibold tracking-[-0.045em]"
        >
          Três passos.
          <br />
          <span className="text-ink-subtle">Nenhuma instalação.</span>
        </h2>

        {/* The animated version; the list below carries the same steps for screen readers. */}
        <div
          aria-hidden="true"
          className="hidden items-center gap-12 group-data-[scene=live]/scene:flex"
        >
          <div className="-ml-[0.06em] h-[1em] overflow-hidden text-[clamp(7rem,22vw,18rem)] leading-none font-semibold tracking-[-0.06em] text-brand-soft tabular-nums">
            <div data-step-digits className="flex flex-col">
              {STEPS.map((step, index) => (
                <span key={step.title} className="h-[1em]">
                  0{index + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="relative min-h-40 flex-1">
            {STEPS.map(({ title, text }) => (
              <div key={title} data-step className="absolute inset-x-0 top-0 flex flex-col gap-3">
                <span className="text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.04em]">
                  {title}
                </span>
                <span className="max-w-md text-lg text-pretty text-ink-muted">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <ol className="grid gap-8 group-data-[scene=live]/scene:sr-only md:grid-cols-3">
          {STEPS.map(({ title, text }, index) => (
            <li key={title} className="flex flex-col gap-2">
              <span className="text-5xl font-semibold tracking-[-0.05em] text-brand-soft tabular-nums">
                0{index + 1}
              </span>
              <span className="text-2xl font-semibold tracking-[-0.03em]">{title}</span>
              <span className="text-base text-pretty text-ink-muted">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
