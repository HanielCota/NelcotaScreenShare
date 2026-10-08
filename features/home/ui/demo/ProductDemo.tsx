import { Hand, MonitorUp, MousePointer2, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { useDemoTimeline } from "@/features/home/hooks/use-demo-timeline";
import { SectionIntro } from "../SectionIntro";
import { DemoWindow } from "./DemoWindow";

const CHAPTERS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MonitorUp,
    title: "Mostre a tela com o som junto",
    text: "Vídeo, apresentação ou aquele bug que só aparece com áudio: vai tudo junto, sem gambiarra.",
  },
  {
    icon: MousePointer2,
    title: "Aponte em vez de explicar",
    text: "Aperte P e mostre onde clicar, direto na tela de quem está compartilhando. Todo mundo vê.",
  },
  {
    icon: Hand,
    title: "Participe sem interromper",
    text: "Reações, mão levantada e chat para quem quer falar sem cortar ninguém.",
  },
];

/** "See it in action": the room demo next to the three chapters it plays. */
export function ProductDemo() {
  const scope = useRef<HTMLElement>(null);
  useDemoTimeline(scope);

  return (
    <section ref={scope} aria-labelledby="demo-title" className="w-full max-w-5xl scroll-mt-28">
      <SectionIntro
        id="demo-title"
        eyebrow="Veja em ação"
        title="Chega de “tá vendo minha tela?”"
        lead="Tudo o que uma boa explicação precisa, numa sala que abre no navegador."
      />

      <div className="mt-12 grid items-center gap-8 lg:mt-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
        <ol className="flex flex-col gap-2 max-lg:order-2">
          {CHAPTERS.map(({ icon: Icon, title, text }) => (
            <li key={title} data-demo-step className="flex gap-4 rounded-2xl p-3 sm:p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">{title}</span>
                <span className="text-sm leading-relaxed text-ink-muted">{text}</span>
                <span
                  aria-hidden="true"
                  className="mt-2 h-0.5 overflow-hidden rounded-full bg-line motion-reduce:hidden"
                >
                  {/* Inline transform, not Tailwind's `scale`: GSAP animates the transform. */}
                  <span
                    data-demo-progress
                    style={{ transform: "scaleX(0)" }}
                    className="block h-full origin-left rounded-full bg-brand"
                  />
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div data-reveal>
          <DemoWindow />
        </div>
      </div>
    </section>
  );
}
