# ADR 0001 — Pastas por feature, DAL do Next e domínio puro só onde há regra

- **Status:** aceita (2026-10-06); as decisões específicas do Next foram substituídas pelo [ADR 0005](0005-react-router-framework.md).
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

## Revisão (2026-10-07): padrão único e restos do Next

A organização tinha se desviado da decisão acima:

- os endpoints em `app/routes/api/` tinham pares `x.ts` + `x.server.ts`, com a lógica (validação, rate limit, LiveKit) dentro de `app/`;
- o mecanismo das operações estava em seis lugares, metade em `features/auth`, e `features/participants/server/operations.server.ts` usava o mesmo nome para outra coisa;
- cada feature tinha um esquema próprio (`engine/` e `dom/` no mascote, arquivos soltos no painel);
- havia pastas de um arquivo só (`features/maintenance`, `features/participants`, `server/actions`, `server/audit`) e regra de negócio em `server/` (`settings.server.ts`).

Decidido:

- **Mesmo padrão em todas as features**, inclusive nas do painel: `domain/`, `server/`, `client/`, `hooks/`, `ui/` e `actions.ts`/`actions.server.ts`, só as que forem necessárias. `engine/` e `dom/` deixam de existir.
- **Rotas finas:** o handler de cada endpoint fica na feature dona (`features/room/server/token-route.server.ts`) e a rota só o liga à URL com `apiLoader`/`apiAction` (`server/api-route.server.ts`). As pastas de `app/routes/api/` espelham a URL.
- **Operações com um lugar por papel:** `lib/operations/` (descritor e hook), `server/operations/` (validação, erros, despacho HTTP), `features/auth/server/operation-policies.server.ts` (quem pode chamar) e `app/operations.server.ts` (registro). O `origin-guard` é infra e foi para `server/`.
- **Peças comuns ganham pasta própria:** `features/security` (sessões e 2FA, usados pela conta e pelo painel), `features/runtime` (inicialização e manutenção), `components/shell` (cabeçalho, navbar, tema), `lib/animation`.
