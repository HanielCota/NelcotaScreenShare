import { CreateRoomButton } from "./CreateRoomButton";

/** Closing call to action, after the last doubts are answered. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      aria-labelledby="cta-title"
      data-fx="expand"
      className="flex w-full max-w-5xl flex-col items-center gap-6 rounded-[2rem] border border-brand/25 bg-brand/10 px-6 py-20 text-center sm:py-28"
    >
      <h2
        id="cta-title"
        className="text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-balance"
      >
        Mostre sua tela.
        <span className="block text-brand-soft">Agora.</span>
      </h2>
      <p className="max-w-lg text-base leading-relaxed text-pretty text-ink-muted sm:text-lg">
        Crie a sala, mande o link e, em menos de um minuto, todo mundo está vendo a mesma tela.
      </p>
      <CreateRoomButton signedIn={signedIn} />
      <p className="text-sm text-ink-subtle">Grátis, sem instalar nada e sem cartão.</p>
    </section>
  );
}
