import type { ReactNode } from "react";
import { ROOM_SHORTCUTS } from "@/lib/shortcuts";
import { SectionIntro } from "./SectionIntro";

function Feature({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div data-fx="sweep" className="flex flex-col gap-2 border-t border-line pt-5">
      <dt className="font-medium">{title}</dt>
      <dd className="text-sm leading-relaxed text-pretty text-ink-muted">{children}</dd>
    </div>
  );
}

const SHORTCUT_KEYS = (
  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
    {ROOM_SHORTCUTS.map(({ key, action }) => (
      <li key={key} className="flex items-center gap-2 text-xs text-ink-muted">
        <kbd className="grid size-6 place-items-center rounded-md border border-line-strong bg-surface text-xs font-medium text-ink">
          {key}
        </kbd>
        {action}
      </li>
    ))}
  </ul>
);

/**
 * What the room does beyond the demo (sound, pointer and chat are shown there), as a
 * plain two-column list; the room size comes from the server setting.
 */
export function FeaturesSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section
      id="recursos"
      aria-labelledby="features-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro
        id="features-title"
        title="Os detalhes."
        subtitle="Pequenos, mas fazem diferença."
      />

      <dl className="mt-12 grid gap-x-10 gap-y-8 sm:mt-16 sm:grid-cols-2">
        <Feature title="Microfone testado antes de entrar">
          Escolha o microfone e veja o nível do som antes de entrar na sala. Sem “alô, tão me
          ouvindo?”.
        </Feature>
        <Feature title="Tela em janela flutuante">
          Acompanhe a tela de alguém numa janela por cima dos seus apps enquanto faz o que ela
          explica.
        </Feature>
        <Feature title={`Salas de até ${maxParticipants} pessoas`}>
          Pequenas de propósito: todo mundo vê, ouve e participa.
        </Feature>
        <Feature title="Tudo no teclado">
          Uma tecla para cada ação. Os atalhos não disparam enquanto você digita.
          {SHORTCUT_KEYS}
        </Feature>
      </dl>
    </section>
  );
}
