import { CreateRoomButton } from "./CreateRoomButton";

/** Closing call to action, after the last doubts are answered. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      aria-labelledby="cta-title"
      className="flex w-full max-w-4xl flex-col items-center gap-5 rounded-2xl border border-brand/25 bg-brand/10 px-6 py-14 text-center sm:py-16"
    >
      <h2 id="cta-title" className="text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
        Mostre sua tela para o time agora
      </h2>
      <p className="max-w-lg text-base leading-relaxed text-pretty text-ink-muted sm:text-lg">
        Crie a sala, mande o link e, em menos de um minuto, todo mundo está vendo a mesma tela.
      </p>
      <CreateRoomButton signedIn={signedIn} />
      <p className="text-sm text-ink-subtle">Grátis, sem instalar nada e sem cartão.</p>
    </section>
  );
}
