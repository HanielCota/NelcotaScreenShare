import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { SectionIntro } from "./SectionIntro";

function faqItems(maxParticipants: number): { question: string; answer: string }[] {
  return [
    {
      question: "Preciso instalar alguma coisa?",
      answer:
        "Não. A sala abre no navegador, tanto no computador quanto no celular. Nada de programa ou extensão.",
    },
    {
      question: "Quem eu convido precisa criar conta?",
      answer:
        "Não. Quem recebe o link entra só com o nome, como convidado, e aparece na sala marcado assim. A conta grátis é só para quem abre a sala.",
    },
    {
      question: "Quanto custa?",
      answer:
        "O plano Grátis não tem prazo nem cartão. O Pro, para times que usam todo dia, vai custar R$ 19 por pessoa por mês; deixe seu e-mail na seção de preços para saber quando abrir.",
    },
    {
      question: "O som do computador vai junto com a tela?",
      answer:
        "No Chrome e no Edge, sim: é só compartilhar com som. No Firefox e no Safari, a tela vai sem o som do computador.",
    },
    {
      question: "Funciona no celular?",
      answer:
        "Funciona para assistir, falar e usar o chat. Para compartilhar a sua tela, entre pelo computador.",
    },
    {
      question: "Quantas pessoas cabem numa sala?",
      answer: `Até ${maxParticipants}. O Nelcota é feito para conversas pequenas, em que todo mundo participa.`,
    },
    {
      question: "As chamadas ficam gravadas?",
      answer: "Não. Áudio, vídeo, telas e mensagens do chat passam ao vivo e não são guardados.",
    },
    {
      question: "O que vocês guardam sobre mim?",
      answer:
        "Só o necessário para a conta e para o histórico de acesso às salas. Na página da conta você baixa tudo isso ou exclui a conta quando quiser, como manda a LGPD.",
    },
  ];
}

/** Nelcota's side of the conversation: its icon at the foot of each answer. */
function NelcotaSays({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-end gap-2.5">
      <img src="/icon.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
      <span className="max-w-[85%] rounded-[1.4rem] rounded-bl-md border border-line bg-surface-2 px-4 py-2.5 text-base leading-relaxed text-pretty">
        {children}
      </span>
    </span>
  );
}

/**
 * Last objections as a chat, like the one in the room: the visitor's questions on the
 * right, Nelcota's answers on the left, and the privacy notice as the last message. Under
 * the bubbles it is still a list of questions and answers.
 */
export function FaqSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section aria-labelledby="faq-title" className="w-full max-w-5xl">
      <SectionIntro id="faq-title" title="Perguntas" subtitle="frequentes." align="center" />

      <dl data-fx className="mx-auto mt-12 flex max-w-2xl flex-col gap-3 sm:mt-16">
        {faqItems(maxParticipants).map(({ question, answer }) => (
          <div key={question} className="flex flex-col gap-3">
            <dt className="max-w-[85%] self-end rounded-[1.4rem] rounded-br-md bg-brand px-4 py-2.5 text-base font-medium text-brand-ink">
              {question}
            </dt>
            <dd>
              <NelcotaSays>{answer}</NelcotaSays>
            </dd>
          </div>
        ))}
        <div className="flex flex-col gap-3 pt-3">
          <dt className="sr-only">E sobre privacidade?</dt>
          <dd>
            <NelcotaSays>
              Os detalhes estão no{" "}
              <Link
                viewTransition
                to="/privacidade"
                className="inline-flex items-center gap-1 font-medium text-brand-soft underline-offset-4 hover:underline"
              >
                aviso de privacidade
                <ArrowRight className="icon-nudge size-4" aria-hidden="true" />
              </Link>
            </NelcotaSays>
          </dd>
        </div>
      </dl>
    </section>
  );
}
