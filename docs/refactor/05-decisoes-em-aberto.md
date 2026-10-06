# 05 — Decisões em aberto e premissas

Nada disto bloqueou a análise. Onde precisei decidir, assumi a premissa marcada abaixo, e a proposta funciona com ela. Se alguma estiver errada, os docs 03 e 04 mudam no ponto indicado.

## Perguntas (a responder antes da Fase 0)

| # | Pergunta | Premissa assumida | Muda o quê |
|---|---|---|---|
| Q1 | O repositório vai para o GitHub (há `ci.yml`, `deploy.yml` e `renovate.json`, mas **não há `git remote`**)? Público ou privado? | Vai para o GitHub, **privado** | Sem remote, a Fase 0 precisa de outro CI. Se for público, S-06 (`workflow_run` de fork) vira prioridade alta |
| Q2 | O WIP do mascote (`MascotPair`, `personality.ts`, +189 linhas em `use-mascot.ts`) será commitado como está, finalizado antes ou descartado? | Será finalizado e commitado **antes** da Fase 0 | Se continuar em paralelo, a subfase 3g conflita com ele; nesse caso, a 3g espera |
| Q3 | Existe algum contrato externo além das URLs do app? (Algum consumidor de `/api/*`, link salvo por usuários, integração lendo `audit_logs`?) | Nenhum. Contratos = URLs de página, `?convite`/`?voltar`/filtros do painel, `/api/token` (só o próprio app usa), webhook do LiveKit e os valores gravados no banco | Se houver consumidor de `/api/admin/exportar/*` ou de `audit_logs`, as colunas do CSV e o `action` ficam congelados (já é a premissa) |
| Q4 | O "app sem banco" é um modo suportado? (`db/index.ts:18` diz que sim; `env.ts:41` diz que `DATABASE_URL` é obrigatória.) | **Não é suportado**: vale o env, e os 27 desvios são código morto | Se for suportado, a Fase 1 (passo 1) sai do plano, e o env é que estaria errado |
| Q5 | A auditoria `action: "user.export"` para exportação de participantes (D-017) pode passar a `participant.export` em registros **novos**? | **Não**, no refactor. É mudança de dado persistido, então vai para a lista de bugs, e a decisão é sua | Consultas e relatórios sobre `audit_logs` |

## Premissas de arquitetura

| # | Premissa | Onde pesa |
|---|---|---|
| P1 | **Uma réplica** no Coolify, cerca de 5 usuários. O rate limit em memória e o cache de settings de 60 s continuam válidos | doc 03 §9 (sem Redis, sem porta para rate limit) |
| P2 | Os testes de integração continuam com **Postgres real** e são a forma de testar o acesso a dados | sem repositórios e sem fakes de banco |
| P3 | Código em **inglês** e UI, URLs e dados persistidos em **português** | renomeia `features/salas` → `features/admin/rooms` etc.; as URLs `/admin/salas` **não** mudam |
| P4 | Componentes continuam em `PascalCase.tsx` (é o padrão da maioria hoje); só os dois hooks em camelCase são renomeados | evita centenas de renomeações sem ganho |
| P5 | O shadcn continua em `components/ui` (a CLI usa os aliases do `components.json`) | não mover para `shared/ui` |
| P6 | `lib/` e `server/` mantêm o nome e mudam o conteúdo, em vez de criar `shared/` | doc 03 §3 |
| P7 | O LiveKit continua sendo o único provedor de mídia | por isso só há um gateway fino, e não uma porta de "mídia" genérica no cliente |
| P8 | Não adicionar jsdom nem Testing Library; a lógica sai para `domain/` e o fluxo é coberto por Playwright | doc 03 §7 |
| P9 | `docs/PLANO-ADMIN.md` é histórico; as decisões novas vão para `docs/adr/` | Fase 5 |

## Limitações desta análise

- **Os testes de integração não foram executados**: o Docker não estava disponível (`docker ps` falhou). A descrição deles vem da leitura do código.
- **Não rodei `pnpm build`**, para não sobrescrever o `.next/` do ambiente de desenvolvimento. O tempo de build e o tamanho do bundle ficaram sem baseline e serão medidos na Fase 0.
- Itens marcados como **"provável"** ou **"suspeita"** no doc 02 (B-01, B-02, B-04, S-02, S-05, entre outros) foram deduzidos lendo o código do app e do SDK, sem reproduzir no navegador ou no container. O E5 da Fase 0 serve justamente para confirmá-los.
- A análise considera o estado do disco em 2026-10-06, com o WIP do mascote incluído.
- Não rodei `pnpm format` nos documentos criados. Você pediu para não rodar formatadores, e isso prevalece sobre a regra do `AGENTS.md`. O resultado do `format:check` está no resumo final.
