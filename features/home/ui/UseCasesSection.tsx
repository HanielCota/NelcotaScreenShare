import { SectionIntro } from "./SectionIntro";

const CASES: { title: string; text: string; uses: string[] }[] = [
  {
    title: "Mostrar um bug",
    text: "Reproduza o erro ao vivo, com o som do computador junto, enquanto o time vê exatamente o que você vê. Sem gravar vídeo e sem “aqui funciona”.",
    uses: ["Som do computador", "Tela inteira, janela ou aba"],
  },
  {
    title: "Revisar uma tela",
    text: "Design e produto apontam direto no que querem mudar, com o ponteiro na tela de quem apresenta. Cada um vê o nome de quem está apontando.",
    uses: ["Ponteiro compartilhado", "Reações e mão levantada"],
  },
  {
    title: "Parear num problema",
    text: "Uma pessoa conduz e a outra acompanha numa janela flutuante por cima do editor, sem ficar trocando de aba.",
    uses: ["Janela flutuante", "Atalhos de teclado"],
  },
];

/** The three moments the product is built for, in the words of a tech team. */
export function UseCasesSection() {
  return (
    <section
      id="para-times"
      aria-labelledby="use-cases-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro id="use-cases-title" title="Feito para o dia a dia do time" />

      <ul className="mt-12 grid gap-x-10 gap-y-10 sm:mt-16 md:grid-cols-3">
        {CASES.map(({ title, text, uses }) => (
          <li key={title} className="flex flex-col gap-3 border-t border-line pt-5">
            <h3 className="text-lg">{title}</h3>
            <p className="text-sm leading-relaxed text-pretty text-ink-muted">{text}</p>
            <p className="mt-auto flex flex-wrap gap-2 pt-1">
              {uses.map((use) => (
                <span
                  key={use}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted"
                >
                  {use}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
