# ADR 0001 — Pastas por feature, DAL do Next e domínio puro só onde há regra

- **Status:** aceita (2026-10-06)
- **Contexto:** o código estava organizado por tipo técnico (`components/`, `lib/`, `hooks/`, `server/`), mas `features/` existia só para o painel. `components/` importava actions de `app/`, havia três pastas de auth e `lib/` guardava regras de domínio. Nenhuma regra automática conseguia dizer o que podia depender de quê.

## Decisão

- Cada domínio fica em `features/<nome>/` (`room`, `mascot`, `auth`, `account`, `admin/*`, `participants`, `home`, `maintenance`), com subpastas conforme a necessidade:
  - `ui/` e `hooks/` (React);
  - `actions.ts` (borda: Zod e autorização pelo next-safe-action);
  - `server/` (`server-only`: consultas e mutações com Drizzle direto, que é o DAL recomendado pelo Next 16);
  - `domain/` (TypeScript puro).
- `components/` e `lib/` guardam só o que é genérico; `server/` guarda só a infra.
- `domain/` existe **apenas** onde há regra de verdade: a decisão do token, as regras do mascote, o protocolo da sala, a presença, o cadastro e as ações do participante. Listagens do painel vão direto da página para `queries.ts`.

## Alternativas descartadas

- **Clean Architecture completa** (repositório e interface para tudo): dobraria os arquivos sem ganho. O Drizzle já é a abstração de dados, e os testes de integração com Postgres real verificam SQL, constraints e triggers melhor que fakes.
- **Manter a organização por tipo** e só quebrar arquivos grandes: não resolve as dependências invertidas nem permite regras de fronteira.

## Consequências

- "Onde fica X?" tem uma resposta.
- As fronteiras ficam impostas pelo lint (ADR 0003).
- Os caminhos mudaram em massa: os commits de movimentação ficaram separados dos de extração, para facilitar a revisão e o revert.
