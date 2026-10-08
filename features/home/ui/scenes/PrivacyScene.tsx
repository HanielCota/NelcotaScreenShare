import { ArrowRight, MessageSquare, Mic, MonitorUp, Video, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { useStageHeader } from "@/features/home/hooks/use-stage-header";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

const NOT_KEPT: { icon: LucideIcon; label: string }[] = [
  { icon: Mic, label: "Áudio" },
  { icon: Video, label: "Vídeo" },
  { icon: MonitorUp, label: "Telas" },
  { icon: MessageSquare, label: "Chat" },
];

/**
 * Privacy as one picture: a record button, struck through. Pinned, the button starts lit, a
 * line crosses it out and it goes dark, then the promise and what it covers come in. Without
 * motion the button is already struck and everything is there.
 */
export function PrivacyScene() {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, (section) => {
    const q = gsap.utils.selector(section);
    gsap
      .timeline({
        defaults: { ease: "power2.inOut", duration: 0.5 },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=160%",
          pin: q("[data-privacy-frame]")[0],
          scrub: 0.5,
          anticipatePin: 1,
        },
      })
      .set(q("[data-rec]"), { opacity: 1, filter: "grayscale(0)" })
      .set(q("[data-rec-strike]"), { scaleX: 0 })
      .set(q("[data-privacy-in]"), { opacity: 0, y: 24 })
      .to(q("[data-rec-dot]"), { scale: 1.25, duration: 0.25, repeat: 1, yoyo: true }, 0)
      .to(q("[data-rec-strike]"), { scaleX: 1, ease: "power3.out" }, 0.5)
      .to(q("[data-rec]"), { opacity: 0.4, filter: "grayscale(1)" }, 0.75)
      .to(q("[data-privacy-in]"), { opacity: 1, y: 0, stagger: 0.15 }, 1.05)
      .to({}, { duration: 0.4 });
  });
  useStageHeader(scope);

  return (
    <section ref={scope} aria-labelledby="privacy-title" className="stage w-full">
      <div
        data-privacy-frame
        className="page-column flex min-h-svh flex-col items-center justify-center gap-8 py-24 text-center"
      >
        <div aria-hidden="true" className="relative">
          <span
            data-rec
            className="inline-flex items-center gap-4 rounded-full border border-white/15 bg-white/[0.04] px-8 py-5 opacity-40 grayscale sm:gap-5 sm:px-10 sm:py-6"
          >
            <span data-rec-dot className="size-6 rounded-full bg-[#ff453a] sm:size-8" />
            <span className="text-3xl font-semibold tracking-[0.12em] sm:text-4xl">REC</span>
            <span className="text-xl text-(--stage-muted) tabular-nums sm:text-2xl">00:00</span>
          </span>
          {/* Rotated around its middle; the line inside draws from left to right. */}
          <span className="absolute inset-x-[-6%] top-1/2 -translate-y-1/2 -rotate-[10deg]">
            <span
              data-rec-strike
              className="block h-1 origin-left rounded-full bg-(--stage-ink) sm:h-1.5"
            />
          </span>
        </div>

        <h2
          id="privacy-title"
          data-privacy-in
          className="text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-balance"
        >
          Nada fica <span className="text-brand">gravado.</span>
        </h2>

        <p data-privacy-in className="max-w-xl text-lg text-pretty text-(--stage-muted) sm:text-xl">
          Tudo passa ao vivo e some quando a sala acaba. Você baixa ou apaga os seus dados quando
          quiser, como manda a LGPD.
        </p>

        <ul
          data-privacy-in
          aria-label="O que passa pela chamada e não é gravado"
          className="flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {NOT_KEPT.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium sm:text-base"
            >
              <Icon className="size-4 text-brand" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        <Link
          data-privacy-in
          viewTransition
          to="/privacidade"
          className="inline-flex items-center gap-1.5 text-base font-medium text-brand underline-offset-4 hover:underline"
        >
          Leia o aviso de privacidade
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
