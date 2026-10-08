import { useRef, type ComponentType } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";
import { WindowDots } from "../demo/RoomChrome";
import { CreateScreen, LinkScreen, ShareScreen } from "./StepVisuals";

const STEPS: {
  title: string;
  text: string;
  url: string;
  Screen: ComponentType<{ className?: string }>;
}[] = [
  {
    title: "Crie a sala.",
    text: "Aperte Enter na barra lá em cima. A sala nasce na hora, com um link só dela.",
    url: "nelcota.app",
    Screen: CreateScreen,
  },
  {
    title: "Mande o link.",
    text: "No chat do time, no e-mail ou no WhatsApp. Quem recebe entra pelo navegador, sem criar conta.",
    url: "nelcota.app/sala/kfa-mtrx-q2p",
    Screen: LinkScreen,
  },
  {
    title: "Compartilhe.",
    text: "A tela inteira, uma janela ou só uma aba, com o som do computador se quiser.",
    url: "nelcota.app/sala/kfa-mtrx-q2p",
    Screen: ShareScreen,
  },
];

const LAST = STEPS.length - 1;
const DIM = 0.35;

/**
 * "How it works" as a timeline: while pinned, a three-part bar fills with the scroll, the
 * current step lights up, and one browser below goes through what each step looks like.
 * Without motion the steps are all lit and the browser shows the last one.
 */
export function StepsScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const q = gsap.utils.selector(section);
    const texts = q("[data-step-text]");
    const bars = q("[data-step-bar]");
    const screens = q("[data-step-screen]");
    const urls = q("[data-step-url]");
    gsap.set(section, { attr: { "data-scene": "live" } });
    const tl = gsap.timeline({
      defaults: { duration: 0.3, ease: "power2.inOut" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=240%",
        pin: q("[data-steps-frame]")[0],
        scrub: 0.5,
        anticipatePin: 1,
      },
    });
    // Start on the first step; the markup holds the last one for the static picture.
    tl.set(texts.slice(1), { opacity: DIM })
      .set(bars, { scaleX: 0 })
      .set([...screens, ...urls], { opacity: 0 })
      .set([screens[0], urls[0]].filter(Boolean), { opacity: 1 })
      .set(screens.slice(1), { y: 24, scale: 0.98 });
    STEPS.forEach((_, index) => {
      tl.to(bars[index] ?? [], { scaleX: 1, duration: 1, ease: "none" }, index);
      if (index === 0) return;
      tl.to(texts[index - 1] ?? [], { opacity: DIM }, index)
        .to(texts[index] ?? [], { opacity: 1 }, index)
        .to(urls[index - 1] ?? [], { opacity: 0, duration: 0.15 }, index)
        .to(urls[index] ?? [], { opacity: 1, duration: 0.15 }, index + 0.15)
        .to(screens[index - 1] ?? [], { opacity: 0, y: -24, scale: 0.98 }, index)
        .to(screens[index] ?? [], { opacity: 1, y: 0, scale: 1 }, index + 0.1);
    });
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
        className="page-column flex flex-col justify-center gap-10 py-24 group-data-[scene=live]/scene:min-h-svh group-data-[scene=live]/scene:gap-8 group-data-[scene=live]/scene:pt-24 group-data-[scene=live]/scene:pb-10"
      >
        <h2
          id="steps-title"
          className="text-[clamp(2.25rem,6vw,5rem)] leading-[1] tracking-[-0.045em]"
        >
          Três passos.
          <span className="block text-ink-subtle">Nenhuma instalação.</span>
        </h2>

        <ol className="grid grid-cols-3 gap-3 sm:gap-6">
          {STEPS.map(({ title, text }, index) => (
            <li key={title} data-step-text className="flex flex-col gap-3">
              <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-line">
                <span data-step-bar className="block h-full origin-left bg-brand" />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-brand-soft tabular-nums">
                  0{index + 1}
                </span>
                <span className="text-base font-semibold tracking-[-0.03em] sm:text-2xl">
                  {title}
                </span>
                <span className="hidden text-base text-pretty text-ink-muted md:block md:[@media(max-height:50rem)]:hidden">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div
          aria-hidden="true"
          className="mx-auto w-[min(100%,56rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <WindowDots className="gap-1.5" dot="size-3" />
            <span className="mx-auto grid w-full max-w-xs rounded-full bg-surface-2 px-3 py-1 text-center text-xs text-ink-muted tabular-nums">
              {STEPS.map(({ title, url }, index) => (
                <span
                  key={title}
                  data-step-url
                  className={`truncate [grid-area:1/1] ${index === LAST ? "" : "opacity-0"}`}
                >
                  {url}
                </span>
              ))}
            </span>
            <span className="w-[3.25rem]" />
          </div>
          <div className="grid aspect-[4/3] sm:aspect-[16/9] sm:group-data-[scene=live]/scene:aspect-auto sm:group-data-[scene=live]/scene:h-[clamp(12rem,calc(100svh-36rem),28rem)] sm:[@media(max-height:50rem)]:group-data-[scene=live]/scene:h-[clamp(12rem,calc(100svh-31rem),28rem)]">
            {STEPS.map(({ title, Screen }, index) => (
              <Screen key={title} className={index === LAST ? "" : "opacity-0"} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
