# 00 — Resumo executivo

## O diagnóstico em uma frase

O projeto **não está bagunçado por inteiro**. O servidor é disciplinado: zero `any`, `strict`, Zod em todas as bordas, DAL com `server-only`, nenhum import circular e só 2,24% de duplicação. A dor está concentrada em **quatro focos**, e os guardrails que deveriam conter esses focos **não estão rodando**.

## O que está errado (por custo)

1. **Os guardrails não protegem nada.** `pnpm lint` falha com 44 erros, e o repositório não tem `git remote`, então o CI e o deploy descritos nunca rodaram (D-051).
2. **Não há rede de segurança no fluxo principal.** Nenhum teste do cliente e nenhum E2E: pré-entrada, conexão, compartilhamento de tela e saída estão descobertos (D-046).
3. **Há arquivos-deus no caminho crítico**:
   - `use-mascot.ts` (um `useEffect` de cerca de 590 linhas, crescendo com o WIP);
   - `PreJoin.tsx` (complexidade 39);
   - `RoomView.tsx` (conexão, layout e erros juntos);
   - `POST /api/token` (165 linhas, regra de negócio no handler, SDK instanciado dentro).
4. **A organização mudou de critério no meio do caminho**:
   - `features/` existe só para o admin;
   - `components/` importa actions de `app/`;
   - há três pastas de auth;
   - `lib/` virou gaveta de domínio;
   - nomes misturam pt/en, e `TokenResult` tem dois significados.
5. **A duplicação está concentrada no painel**: 4 exportações CSV, 4 `iterate`/`list`/filtros de período, e filtros de tabela 90% iguais.
6. **O banco "opcional" é falso**: 27 desvios `if (!db)` que nunca rodam, com tipos que mentem.

Em paralelo, a leitura achou **achados fora do escopo, a corrigir em PRs próprios**:
- **Open redirect** pós-login via `?voltar=/%09/evil.com` (S-01, confirmado no código).
- **Endpoints do plugin admin do Better Auth expostos** sem 2FA nem auditoria (S-02).
- **Exclusão de conta sem rate limit** (S-03).
- **Falha de conexão mostra "Você saiu da sala"** em vez de "Tentar de novo" (B-01).
- **Eventos do webhook perdidos sem reprocessamento** (B-03).
- **`create-owner` provavelmente quebrado na imagem Docker** (B-04).

## O que propomos

**Pastas por feature + o Data Access Layer que o próprio Next 16 recomenda + núcleo puro só onde existe regra.** Não é Clean Architecture completa.

- `features/{room, home, mascot, auth, account, participants, admin/*}`, cada uma com `ui/` → `actions.ts` → `server/` (queries e commands com Drizzle direto) → `domain/` (TS puro).
- `components/`, `lib/` e `server/` ficam só para o que é **genérico** e para infraestrutura.
- **Uma única "porta"** (o gateway do LiveKit server SDK para emitir o token). Sem repositórios, sem interface para banco ou e-mail e sem biblioteca de `Result`. Os testes de integração com Postgres real já fazem melhor esse papel.
- **As fronteiras ficam impostas pelo oxlint** que já existe (`no-restricted-imports` por pasta + `no-cycle`), com knip, jscpd e `drizzle-kit check` no CI. O dependency-cruiser foi descartado porque o TypeScript 7 instalado não expõe a API JS de que ele precisa (verificado).
- **Exemplo validável**: `/api/token` vira borda HTTP de cerca de 30 linhas, mais orquestração no servidor, decisão pura testável por ramo e gateway do SDK, **com o mesmo contrato, as mesmas mensagens e a mesma ordem de checagens** (doc 03 §6).

## Esforço e ordem recomendada

| Ordem | Fase | Horas | Risco |
|---|---|---|---|
| 0 | Correções de segurança S-01..S-03 (PRs próprios, fora do refactor) | ~3 | baixo |
| 1 | **Fase 0**: lint verde, CI real, código morto, knip/jscpd, **Playwright com 8 fluxos** e testes de caracterização | 22 | baixo |
| 2 | **Fase 1**: transversais (banco não opcional, env único, constantes, `server-only`) | 6 | baixo |
| 3 | **Fase 2**: helpers do painel (CSV, períodos, iterate) e DAL fora das páginas | 7 | baixo |
| 4 | **Fase 3**: features nesta ordem: settings/busca → painel → auth/conta → home → mascote → **sala ao vivo** (por último, a mais crítica) | 58 | baixo → alto |
| 5 | **Fase 4**: quebrar os componentes grandes e ajustar a fronteira server/client | 8 | médio |
| 6 | **Fase 5**: README, ADRs, apertar a catraca do lint | 5 | baixo |
| | **Total do refactor** | **≈ 106 h** | |

Cada fase é deployável e entrega valor sozinha, então dá para **parar depois de qualquer uma** com o projeto melhor do que antes. O refactor **não tem nenhuma migração de banco**. Os quick wins (menos de 1 h cada) estão no doc 04 §3.

## Documentos

| Doc | Conteúdo |
|---|---|
| [01-inventario.md](01-inventario.md) | Árvore anotada, grafo de imports, rotas e actions, fluxos, dependências e métricas |
| [02-diagnostico.md](02-diagnostico.md) | 55 problemas com evidência, achados fora do escopo (11 de segurança e 14 bugs) e ranking dos 10 que mais custam |
| [03-arquitetura-alvo.md](03-arquitetura-alvo.md) | Camadas, regra de dependência, árvore alvo, exemplo ponta a ponta, decisões e onde não aplicar SOLID |
| [04-plano-de-migracao.md](04-plano-de-migracao.md) | Rede de segurança, fases com critérios e rollback, quick wins, métricas e riscos |
| [05-decisoes-em-aberto.md](05-decisoes-em-aberto.md) | 5 perguntas, 9 premissas e as limitações da análise |

**Próximo passo:** aprovar a arquitetura-alvo (doc 03) e a ordem das fases (doc 04) e responder Q1–Q5 do doc 05. Nada será implementado antes disso.
