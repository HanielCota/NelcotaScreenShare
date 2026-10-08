import { ArrowRight, MessageSquare, Mic, MonitorUp, Video, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { useStageHeader } from "@/features/home/hooks/use-stage-header";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

const NOT_KEPT: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: Mic, label: "Áudio", detail: "Microfone e som do computador" },
  { icon: Video, label: "Vídeo", detail: "O que passa na chamada" },
  { icon: MonitorUp, label: "Telas", detail: "Tudo o que foi compartilhado" },
  { icon: MessageSquare, label: "Chat", detail: "Mensagens e reações" },
];

/**
 * Privacy as a scene: the promise stays on the left while, pinned, the four things that pass
 * through a call dissolve one by one on the right, and the room is left empty. Without
 * motion the promise and the four cards are simply there.
 */
export function PrivacyScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const q = gsap.utils.selector(section);
    gsap.set(section, { attr: { "data-scene": "live" } });
    gsap
      .timeline({
        defaults: { ease: "power1.inOut", duration: 0.6 },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=200%",
          pin: q("[data-privacy-frame]")[0],
          scrub: 0.5,
          anticipatePin: 1,
        },
      })
      .to(
        q("[data-privacy-card]"),
        { opacity: 0.06, scale: 0.94, filter: "blur(10px)", stagger: 0.55 },
        0.2,
      )
      .fromTo(q("[data-privacy-end]"), { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, ">-0.2")
      .to({}, { duration: 0.4 });
  });
  useStageHeader(scope);

  return (
    <section ref={scope} aria-labelledby="privacy-title" className="group/scene stage w-full">
      <div
        data-privacy-frame
        className="page-column grid min-h-svh content-center items-center gap-12 py-24 md:grid-cols-2 md:gap-16"
      >
        <div className="flex flex-col gap-6">
          <h2
            id="privacy-title"
            className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] font-semibold tracking-[-0.05em]"
          >
            Nada fica
            <span className="block text-brand">gravado.</span>
          </h2>
          <p className="max-w-md text-lg text-pretty text-(--stage-muted) sm:text-xl">
            Tudo passa ao vivo e some quando a sala acaba. Você baixa ou apaga os seus dados quando
            quiser, como manda a LGPD.
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

        <div className="relative">
          <ul
            aria-label="O que passa pela chamada e não é gravado"
            className="grid grid-cols-2 gap-3 sm:gap-4"
          >
            {NOT_KEPT.map(({ icon: Icon, label, detail }) => (
              <li
                key={label}
                data-privacy-card
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
              >
                <span className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-full bg-brand/15 text-brand">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--stage-muted)">
                    <span className="size-1.5 rounded-full bg-[#4ade80]" aria-hidden="true" />
                    ao vivo
                  </span>
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-xl font-semibold tracking-[-0.02em]">{label}</span>
                  <span className="text-sm text-pretty text-(--stage-muted)">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
          {/* The closing picture, only when the cards actually dissolve. */}
          <p
            data-privacy-end
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden place-content-center text-center text-2xl font-semibold tracking-[-0.03em] text-balance group-data-[scene=live]/scene:grid sm:text-3xl"
          >
            A sala acabou.
            <span className="block text-(--stage-muted)">Não ficou nada.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
