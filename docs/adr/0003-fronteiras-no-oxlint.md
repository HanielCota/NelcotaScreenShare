# ADR 0003 — Fronteiras de arquitetura no oxlint (sem dependency-cruiser)

- **Status:** aceita (2026-10-06)
- **Contexto:** era preciso impedir que a organização voltasse a se misturar. As opções avaliadas foram `dependency-cruiser@18.5.0`, `eslint-plugin-boundaries@7.2.0` e as regras do próprio oxlint, que o projeto já usa com informação de tipos.

## Decisão

As fronteiras ficam no `oxlint.config.ts`, com `no-restricted-imports` por pasta:

| Pasta                                                                                       | Não pode importar                                                                                                 |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `components/**`, `lib/**`                                                                   | features, rotas, servidor                                                                                         |
| UI, hooks e client de cada feature (um override gerado por feature a partir de `features/`) | servidor, banco, SDK de servidor, UI de outra feature (exceto `features/mascot/ui` e o aviso de compartilhamento) |
| `features/*/domain/**`, `features/mascot/engine/**`                                         | React, Next, banco, SDKs, `@/server`                                                                              |
| `server/**`                                                                                 | features (exceto `domain/`), rotas, componentes                                                                   |

Completam a proteção:

- `import/no-cycle` impede ciclos;
- `max-lines` (300) e `complexity` (15) limitam tamanho e complexidade, sem lista de exceções;
- `knip` acusa código morto;
- `jscpd` falha com duplicação acima de 2%.

Tudo isso roda no CI.

## Por que não as alternativas

- **dependency-cruiser:** precisa da API JS do compilador TypeScript para ler `.ts`, e o TypeScript 7.0.2 instalado não a expõe (`require("typescript").createSourceFile` é `undefined`). Exigiria instalar e manter o SWC só para isso.
- **eslint-plugin-boundaries:** exige o ESLint como segundo linter, ao lado do oxlint.

## Consequências

- A regra é por padrão de caminho, menos precisa que um grafo, mas suficiente aqui. As três violações plantadas em teste (UI de outra feature, React no domínio, infra importando servidor de feature) foram barradas.
