## Formatação obrigatória para agentes de IA

- Sempre que criar ou alterar arquivos neste projeto, execute `pnpm format` na raiz do repositório após as alterações e antes das verificações finais. Formate o projeto inteiro, incluindo `components/ui`, sem esperar que o usuário peça.
- Após a última alteração, execute `pnpm format:check` e corrija qualquer falha antes de concluir a tarefa. Se precisar editar novamente, repita a formatação e a checagem.
- Use o Oxfmt e a configuração `.oxfmtrc.json`; mantenha as exclusões de dependências, builds e metadados gerados. Não crie exclusões para código mantido no projeto apenas para evitar formatá-lo.
- Se a formatação falhar ou não puder ser executada, informe o motivo na resposta final. Não declare que passou sem executar a checagem.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
