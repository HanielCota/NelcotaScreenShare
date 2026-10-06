# ADR 0004 — Idioma do código e nomes

- **Status:** aceita (2026-10-06)
- **Contexto:** pastas em português (`features/salas`) conviviam com componentes em inglês (`RoomsTable`). `features/usuarios` continha `Participant*`. O tipo `TokenResult` tinha dois significados.

## Decisão

- **Inglês**: identificadores, pastas, arquivos e chaves internas de código.
- **Português**:
  - textos da interface, mensagens de erro e comentários;
  - URLs e parâmetros (`/sala`, `?convite`, `?voltar`, `de`/`ate`), porque são contrato com quem já tem links salvos;
  - valores já gravados no banco (por exemplo, `action: "user.export"` na auditoria e os metadados `motivo`/`sala`). Mudar esses valores é mudança de dado, decidida à parte.
- **Nomes de arquivo**:
  - componentes React em `PascalCase.tsx`;
  - hooks em `use-*.ts`;
  - o resto em `kebab-case.ts`.
- **Termos do domínio**: `participant` é a pessoa que entra em salas (tabela `users`); `admin` é a conta do painel. `TokenFetchResult` (resultado do pedido no navegador) é diferente do registro em `token_requests`.
- **Sem barrel files.** Os imports são diretos ao arquivo, com o alias `@/`.

## Pendências conhecidas

- O payload interno das ações em massa ainda usa `{ tipo: "ids" | "filtro", busca }` (`lib/table-params.ts`). Trocar exige mudar actions, tabelas e testes juntos; fica para quando essa parte for mexida.
