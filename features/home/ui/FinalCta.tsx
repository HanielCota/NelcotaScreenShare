import { ArrowUp, Loader2, Plus } from "lucide-react";
import { useTransition } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { generateRoomCode, roomPath } from "@/features/room/domain/room-code";
import { prefersReducedMotion } from "@/lib/animation/motion";

/** Id of the hero block that holds the entry bar. */
export const HERO_START_ID = "comecar";

/** Takes the visitor back to the hero bar, ready to paste a link. */
function focusHeroBar() {
  const start = document.getElementById(HERO_START_ID);
  if (!start) return;
  start.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  start.querySelector("input")?.focus({ preventScroll: true });
}

/** Closing call to action: create a room right away, or go back up to paste a link. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate();
  const [pending, startTransition] = useTransition();

  function createRoom() {
    startTransition(() => navigate(roomPath(generateRoomCode()), { viewTransition: true }));
  }

  return (
    <section
      aria-labelledby="cta-title"
      className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-brand/25 bg-brand/10 px-6 py-14 text-center sm:px-12 sm:py-20"
    >
      <img
        data-reveal
        src="/icon.png"
        alt=""
        width={64}
        height={64}
        loading="lazy"
        className="mx-auto size-16 rounded-2xl"
      />
      <h2
        id="cta-title"
        data-reveal-heading
        className="mx-auto mt-6 max-w-xl text-3xl leading-tight tracking-[-0.03em] sm:text-5xl"
      >
        Sua próxima explicação começa com um Enter.
      </h2>
      <p
        data-reveal
        className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-pretty text-ink-muted sm:text-lg"
      >
        Crie a sala, mande o link e, em menos de um minuto, todo mundo está vendo a mesma tela.
      </p>

      <div data-reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={createRoom} disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {pending ? "Abrindo…" : "Criar uma sala agora"}
        </Button>
        <Button size="lg" variant="secondary" onClick={focusHeroBar}>
          <ArrowUp aria-hidden="true" />
          Recebi um link
        </Button>
      </div>

      {signedIn ? null : (
        <p data-reveal className="mt-5 text-sm text-ink-subtle">
          Ainda sem conta? Você cria uma em segundos e volta direto para a sala.
        </p>
      )}
    </section>
  );
}
