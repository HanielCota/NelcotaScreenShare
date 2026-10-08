import { Link2, MonitorUp, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";
import { ScrollTrigger } from "@/lib/animation/gsap-scroll";
import { SectionIntro } from "./SectionIntro";

const STEPS: { icon: LucideIcon | "enter"; title: string; text: string }[] = [
  {
    icon: "enter",
    title: "Crie a sala",
    text: "Aperte Enter na barra lá em cima. A sala nasce na hora, com um link só dela.",
  },
  {
    icon: Link2,
    title: "Mande o link",
    text: "Cole no chat do time, no e-mail ou no WhatsApp. Quem recebe entra pelo navegador.",
  },
  {
    icon: MonitorUp,
    title: "Compartilhe",
    text: "Escolha a tela inteira, uma janela ou só uma aba. Com o som do computador, se quiser.",
  },
];

function StepMark({ icon: Icon }: { icon: LucideIcon | "enter" }) {
  if (Icon === "enter") {
    return (
      <kbd className="inline-flex h-12 items-center rounded-xl border border-b-[3px] border-line-strong bg-surface-2 px-3.5 text-sm font-medium">
        Enter
      </kbd>
    );
  }
  return (
    <span className="grid size-12 place-items-center rounded-xl border border-line bg-surface-2 text-brand-soft">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

/** "How it works": three steps joined by a line that fills as the visitor scrolls. */
export function StepsSection() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        ScrollTrigger.create({
          animation: gsap.from("[data-steps-line]", { scaleX: 0, ease: "none" }),
          trigger: "[data-steps-list]",
          start: "top 75%",
          end: "bottom 55%",
          scrub: 0.6,
        });
      });
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      id="como-funciona"
      aria-labelledby="steps-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro
        id="steps-title"
        eyebrow="Como funciona"
        title="Três passos. Nenhuma instalação."
        lead="Sem programa, sem extensão e sem configurar nada: a sala abre no navegador que você já usa."
      />

      <ol data-steps-list className="relative mt-12 grid gap-10 sm:mt-16 md:grid-cols-3 md:gap-8">
        <span
          aria-hidden="true"
          className="absolute top-6 right-[16%] left-[16%] h-px bg-line max-md:hidden"
        >
          <span data-steps-line className="block h-full origin-left bg-brand" />
        </span>
        {STEPS.map(({ icon, title, text }, index) => (
          <li
            key={title}
            data-reveal
            className="relative flex flex-col items-center gap-4 text-center"
          >
            <span className="bg-canvas px-3">
              <StepMark icon={icon} />
            </span>
            <span className="text-sm font-medium text-ink-subtle tabular-nums">
              Passo {index + 1}
            </span>
            <h3 className="text-xl">{title}</h3>
            <p className="max-w-xs text-sm leading-relaxed text-pretty text-ink-muted">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
