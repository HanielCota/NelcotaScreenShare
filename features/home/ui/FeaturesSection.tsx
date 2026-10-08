import {
  Keyboard,
  MessageSquare,
  Mic,
  MousePointer2,
  PictureInPicture2,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ROOM_SHORTCUTS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { SectionIntro } from "./SectionIntro";

function FeatureCard({
  icon: Icon,
  title,
  children,
  wide = false,
  extra,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  wide?: boolean;
  extra?: ReactNode;
}) {
  return (
    <li
      data-reveal
      className={cn(
        "flex flex-col gap-3 rounded-3xl border border-line bg-surface/60 p-6 transition-colors duration-200 hover:border-brand/40",
        wide && "sm:col-span-2",
      )}
    >
      <Icon className="size-6 text-brand-soft" aria-hidden="true" />
      <h3 className="text-lg">{title}</h3>
      <p className="text-sm leading-relaxed text-pretty text-ink-muted">{children}</p>
      {extra}
    </li>
  );
}

const SHORTCUT_KEYS = (
  <dl className="mt-auto flex flex-wrap gap-2 pt-2">
    {ROOM_SHORTCUTS.map(({ key, action }) => (
      <div key={key} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1">
        <dt>
          <kbd className="grid size-6 place-items-center rounded-full border border-line-strong bg-surface text-xs font-medium">
            {key}
          </kbd>
        </dt>
        <dd className="text-xs text-ink-muted">{action}</dd>
      </div>
    ))}
  </dl>
);

/** What the room offers, as a bento grid; the room size comes from the server setting. */
export function FeaturesSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section
      id="recursos"
      aria-labelledby="features-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro
        id="features-title"
        eyebrow="Recursos"
        title="Feito para explicar, não para fazer reunião."
        lead="Só o que ajuda alguém a entender o que você está mostrando. Nada de menus que ninguém usa."
      />

      <ul className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={Volume2} title="O som do computador vai junto" wide>
          Mostre um vídeo, uma música ou aquele bug barulhento sem pedir para ninguém “aumentar aí”.
          Funciona no Chrome e no Edge.
        </FeatureCard>
        <FeatureCard icon={MousePointer2} title="Ponteiro compartilhado">
          Aponte na tela de outra pessoa: o ponteiro aparece para todo mundo, com o seu nome.
        </FeatureCard>
        <FeatureCard icon={MessageSquare} title="Chat, reações e mão levantada">
          Participe sem cortar quem está falando.
        </FeatureCard>
        <FeatureCard icon={PictureInPicture2} title="Tela em janela flutuante">
          Acompanhe a tela de alguém numa janela por cima dos seus apps enquanto faz o que ela
          explica.
        </FeatureCard>
        <FeatureCard icon={Users} title={`Salas de até ${maxParticipants} pessoas`}>
          Pequenas de propósito: todo mundo vê, ouve e participa.
        </FeatureCard>
        <FeatureCard icon={Keyboard} title="Tudo no teclado" wide extra={SHORTCUT_KEYS}>
          Uma tecla para cada ação. Os atalhos não disparam enquanto você digita.
        </FeatureCard>
        <FeatureCard icon={Mic} title="Microfone testado antes de entrar">
          Escolha o microfone e veja o nível do som antes de entrar na sala. Sem “alô, tão me
          ouvindo?”.
        </FeatureCard>
      </ul>
    </section>
  );
}
