## Formatação obrigatória para agentes de IA

- Sempre que criar ou alterar arquivos neste projeto, execute `pnpm format` na raiz do repositório após as alterações e antes das verificações finais. Formate o projeto inteiro, incluindo `components/ui`, sem esperar que o usuário peça.
- Após a última alteração, execute `pnpm format:check` e corrija qualquer falha antes de concluir a tarefa. Se precisar editar novamente, repita a formatação e a checagem.
- Use o Oxfmt e a configuração `.oxfmtrc.json`; mantenha as exclusões de dependências, builds e metadados gerados. Não crie exclusões para código mantido no projeto apenas para evitar formatá-lo.
- Se a formatação falhar ou não puder ser executada, informe o motivo na resposta final. Não declare que passou sem executar a checagem.

## React Router

- O app usa React Router 8 Framework Mode com Vite e SSR. As rotas são explícitas em `app/routes.ts`.
- Dados e permissões ficam em loaders; mutações ficam em actions. Use módulos `.server.ts` para código privado e preserve a fronteira validada pelo build.
- Rode `pnpm typecheck`, `pnpm lint`, testes e build ao alterar a aplicação. O runtime e o container usam Node 26.9.
