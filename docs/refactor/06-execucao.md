# 06 — Execução da refatoração

> Executada em 2026-10-06 na branch `refactor/arquitetura`, a partir do estado analisado (`07e1259`, que inclui o WIP do mascote). São 17 commits pequenos, cada um com lint, tipos, testes e E2E verdes. Os commits de **movimentação** ficaram separados dos de **extração**, para facilitar a revisão e o revert.

## O que foi feito, por fase

| Commit                          | Fase      | Conteúdo                                                                                                                                                                                                                                |
| ------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7fbdd68`                       | Segurança | S-01: open redirect (`safeReturnPath` pelo parser de URL). S-02: rotas HTTP do plugin admin fechadas. S-03: limite de senhas erradas ao excluir a conta. S-04: `bootstrap.sql` refaz os REVOKE                                          |
| `9dffacd`                       | Segurança | S-11/B-03: retenção LGPD + reprojeção a cada 6 h. S-05: token sem `canUpdateOwnMetadata`, com "mão" por `POST /api/sala/mao`. S-10: corpo do webhook limitado, limite no receptor, sem câmera no `Permissions-Policy`. S-09, S-06, S-07 |
| `923eb85`                       | Bugs      | B-01, B-02, B-04 (create-owner na imagem, **testado no container**), B-05 a B-13                                                                                                                                                        |
| `d7835db`, `61e8606`            | Fase 0    | Lint verde; 12 fluxos E2E (Playwright); teste dos papéis do Postgres; knip, jscpd, cobertura com catraca, limites de tamanho e complexidade; CI com E2E, `docker build` e checagem de schema                                            |
| `771b2b7`                       | Fase 1    | Banco não opcional (27 desvios mortos removidos); env validado num lugar só; constantes de auth unificadas; `PASSWORD_LIMITS` em todo lugar                                                                                             |
| `7e4161c`                       | Fase 2    | Exportações CSV por uma fábrica, com stream de verdade (`pull`); filtros de período e iteração comuns; dados LGPD num módulo próprio                                                                                                    |
| `ecaae1c`                       | 3a/3b     | Painel em `features/admin/*`; peças genéricas em `components/`; `AuditTable` dividida                                                                                                                                                   |
| `495bb1f`                       | 3d        | Auth e conta em `features/auth` e `features/account`; `SessionList` recebe as actions por prop                                                                                                                                          |
| `4927aa3`                       | 3e        | Home como Server Component com ilhas client                                                                                                                                                                                             |
| `daa4900`                       | 3g        | Mascote: hook de 666 linhas dividido em controlador, animador, reações, sono, sinais e regras puras; listeners globais compartilhados                                                                                                   |
| `21aad0e`, `a7c966d`, `8987fef` | 3f        | Sala: movimentação; token e webhook em camadas; PreJoin, RoomView e ScreenStage divididos; fronteiras no lint                                                                                                                           |
| `618d126`                       | Fase 4    | Páginas de detalhe em Server Components; catraca do lint zerada                                                                                                                                                                         |
| (este)                          | Fase 5    | README atualizado, ADRs (`docs/adr/0001` a `0004`), este registro                                                                                                                                                                       |

## Métricas: antes → depois

"Antes" é o commit `07e1259`, o estado analisado. As medições foram feitas com as mesmas ferramentas do inventário.

| Métrica                                                       | Antes                 | Depois                                         | Meta (doc 04)                    |
| ------------------------------------------------------------- | --------------------- | ---------------------------------------------- | -------------------------------- |
| `pnpm lint`                                                   | 44 erros              | **0**                                          | 0                                |
| Maior arquivo não-vendor                                      | 666 (`use-mascot.ts`) | 360 linhas, 300 úteis (`mascot-controller.ts`) | ≤ 300 úteis ✓                    |
| Arquivos acima de 300 linhas úteis                            | 6                     | **0** (sem lista de exceções)                  | 0 ✓                              |
| Maior complexidade                                            | 39 (`PreJoin`)        | **14**                                         | ≤ 15 ✓                           |
| Funções com complexidade > 12                                 | 23                    | 13                                             | ≤ 8 ✗ (todas ≤ 14)               |
| `any` / casts inseguros no app                                | 0 / 18                | 0 / **0**                                      | 0 ✓                              |
| `if (!db)` / `db!`                                            | 27 / 19               | **0 / 0**                                      | 0 ✓                              |
| Duplicação (jscpd)                                            | 2,24% (51 clones)     | **1,67%** (34 clones)                          | ≤ 1,5% ✗ (perto)                 |
| knip: arquivos / deps / exports sem uso                       | 2 / 1 / 36            | **0 / 0 / 0**                                  | 0 ✓                              |
| Imports `components → app`                                    | 5                     | **0** (barrados pelo lint)                     | 0 ✓                              |
| Testes                                                        | 141 (sem E2E)         | **201 + 12 E2E**                               | 8 fluxos E2E ✓                   |
| Cobertura de linhas, unit + integração (inclui `components/`) | 32,7%                 | **35,3%**                                      | catraca ✓                        |
| Cobertura do domínio puro (`domain/` + `engine/`)             | —                     | **90,5%**                                      | ≥ 90% ✓                          |
| Cobertura de `features/*/server` + DAL                        | —                     | 85,3%                                          | ≥ 80% ✓                          |
| Cobertura de `server/` (infra)                                | —                     | 78,8%                                          | ≥ 80% ✗ (perto)                  |
| Tempo de `pnpm build`                                         | ~7–15 s               | ~17 s                                          | não piorar ≈ (variação de cache) |
| JS da home (gzip)                                             | 215 KB                | **211 KB** (−2%)                               | −10% ✗                           |
| JS de `/entrar` (gzip)                                        | 226 KB                | **188 KB** (−17%)                              | —                                |
| JS de `/admin/salas` (gzip)                                   | 176 KB                | **139 KB** (−21%)                              | —                                |
| JS da sala (gzip)                                             | 405 KB                | 410 KB (+1%)                                   | não piorar ✗ (+5 KB)             |

Sobre as metas não atingidas:

- **Sala +5 KB:** são os módulos novos (hub de listeners do mascote, limite no receptor, chamada da mão pelo servidor) e o custo de dividir arquivos.
- **Home −2%:** quase todo o JS da home vem do SDK do LiveKit, do Zod e do GSAP, não do código do app.

## Desvios do plano (decididos durante a execução)

| Item do plano                                      | O que aconteceu                                                                        | Motivo                                                                                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useFormSubmit` para o par `pending`/`error` (×11) | **Não feito**                                                                          | O hook só embrulharia dois `useState`, sem tirar complexidade de lugar nenhum                                                                                                                    |
| `SignInForm` único com `scope`                     | **Não feito**; as peças comuns (`FormError`, `PasswordInput`) foram para `components/` | Os dois formulários diferem de propósito (mascote, sugestão de e-mail, validação). Juntar exigiria condicionais por todo lado                                                                    |
| Renomear `{ tipo, busca }` das ações em massa      | **Adiado** (ADR 0004)                                                                  | É contrato entre tabela, action e testes; vale mudar junto com a próxima mudança dessa área                                                                                                      |
| `"use client"` menor que o baseline                | **87 arquivos** (antes 73)                                                             | Dividir componentes client gera mais arquivos client. A home, o `BrandPanel`, as seções de detalhe e a `Section` passaram a ser servidor, e o JS por página caiu nas telas de acesso e do painel |
| Exceções de lint "nomeadas por fase"               | A lista foi **zerada** na Fase 4                                                       | —                                                                                                                                                                                                |

## Mudanças de comportamento (bugs e segurança, de propósito)

Todas estão nos commits de segurança e de bugs. As principais que se notam no uso:

- O login não aceita mais um `?voltar=` que leve para outro site.
- A senha errada ao excluir a conta é limitada a 5 tentativas em 15 min.
- **Levantar a mão** agora passa pelo servidor. O E2E confirmou com o LiveKit real.
- Uma falha ao conectar mostra **"Não deu para conectar / Tentar de novo"** em vez de "Você saiu da sala".
- Cancelar o seletor de tela não mostra mais um aviso de microfone.
- O link "Acompanhar ao vivo" (página inexistente) saiu do detalhe da sala.
- As iniciais do avatar seguem a mesma regra (primeiro e último nome) na pré-entrada e na sala.
- Os botões do mascote saíram da ordem do Tab.
- As tabelas do painel deixaram de oferecer "selecionar todos" acima do limite que o servidor recusa.

## O que fica com você

1. **Remote e CI (Q1).** O CI e o deploy só rodam com o repositório no GitHub. O workflow de deploy já recusa disparos vindos de fork.
2. **Primeira manutenção em produção.** Na primeira rodada (1 min após o boot), a retenção apaga o que estiver fora do prazo: pedidos de token e IPs com mais de 6 meses, nomes com mais de 12, eventos e falhas de login com mais de 30 dias. O app é novo, então deve haver pouco ou nada a apagar. Se houver dado antigo a preservar, ajuste `RETENTION_DAYS` em `features/maintenance/maintenance.ts` antes do deploy.
3. **Coolify.** Para ter rollback de verdade, aponte o recurso para a tag `:<sha>` (README, seção do App).
4. **Decisões de produto ainda abertas:**
   - auditoria `user.export` → `participant.export` (Q5);
   - duração de sala reaberta (B-14);
   - IP desconhecido compartilhando o mesmo limite (S-08, aceito: com o Traefik, o `X-Forwarded-For` sempre existe).
5. **Merge.** A branch `refactor/arquitetura` está pronta para revisão. Ela também inclui o seu WIP do mascote, num commit próprio (`07e1259`).
