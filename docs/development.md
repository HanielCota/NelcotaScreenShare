# Desenvolvimento

Tudo o que é preciso para rodar, testar e manter o código. A organização das pastas está no [guia da arquitetura](README.md) e as decisões em [`adr/`](adr/).

## Rodando localmente

Pré-requisitos: Node 26.9+, pnpm 12.9.1 (`npm install -g pnpm@12.9.1`) e Docker.

```bash
# 1. LiveKit em modo dev (a chave precisa ter 32+ caracteres; o app valida isso)
docker run -d --name lk-dev \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server:v1.13.7 \
  --dev --bind 0.0.0.0 --node-ip 127.0.0.1 \
  --keys "devkey: devsecret-0123456789abcdef0123456789abcdef"

# 2. Postgres local (mesma configuração e papéis da produção)
pnpm db:bootstrap:dev        # docker compose -f docker-compose.dev.yml up -d --wait

# 3. Variáveis
cp .env.example .env.local
#   LIVEKIT_API_KEY=devkey
#   LIVEKIT_API_SECRET=devsecret-0123456789abcdef0123456789abcdef
#   LIVEKIT_URL=ws://localhost:7880
#   DATABASE_URL=postgres://nelcota_app:app-dev@127.0.0.1:54329/nelcota
#   MIGRATOR_DATABASE_URL=postgres://nelcota_migrator:migrator-dev@127.0.0.1:54329/nelcota
#   TEST_DATABASE_URL=postgres://nelcota:nelcota-dev@127.0.0.1:54329/nelcota_test

# 4. App
pnpm install
pnpm db:migrate     # migrações com o usuário de migração
pnpm db:seed        # opcional: participantes (senha senha-dev-1234), salas e auditoria de exemplo
pnpm dev            # http://localhost:3000
```

Abra duas abas (ou uma janela anônima), entre na mesma sala e compartilhe a tela.

## Scripts

| Script                                     | O que faz                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`   | Desenvolvimento, build de produção e servidor de produção local                         |
| `pnpm typecheck`                           | `tsc --noEmit` (TypeScript 7 nativo)                                                    |
| `pnpm lint` / `pnpm lint:fix`              | Oxlint completo com informação de tipos e correções seguras                             |
| `pnpm lint:fast` / `pnpm lint:fast:fix`    | Regras sintáticas do Oxlint, sem o motor de tipos                                       |
| `pnpm lint:config`                         | Mostra a configuração efetivamente carregada pelo Oxlint                                |
| `pnpm format`                              | Oxfmt (`.oxfmtrc.json`)                                                                 |
| `pnpm format:check`                        | Confere a formatação do projeto sem alterar arquivos                                    |
| `pnpm test`                                | Vitest: unitários + integração (esta só com `TEST_DATABASE_URL`)                        |
| `pnpm test:unit` / `pnpm test:integration` | Só um dos projetos do Vitest                                                            |
| `pnpm test:watch` / `pnpm test:coverage`   | Modo observação / cobertura (`coverage/`, com mínimo por catraca)                       |
| `pnpm test:e2e`                            | Playwright: fluxos da sala, do painel e da conta (Postgres e LiveKit de dev ligados)    |
| `pnpm knip`                                | Arquivos, exports e dependências sem uso                                                |
| `pnpm dup`                                 | Duplicação de código (jscpd, limite em `.jscpd.json`)                                   |
| `pnpm db:bootstrap:dev`                    | Sobe o Postgres local (`docker-compose.dev.yml`) com os papéis                          |
| `pnpm db:generate`                         | Gera a migração SQL em `drizzle/` a partir de `server/db/schema/`                       |
| `pnpm db:migrate`                          | Aplica as migrações com `MIGRATOR_DATABASE_URL`                                         |
| `pnpm db:studio`                           | Abre o Drizzle Studio                                                                   |
| `pnpm db:seed`                             | Dados de exemplo (só banco local). `--perfil=carga --linhas=300000` para teste de carga |
| `pnpm build:migrate`                       | Empacota o migrador em `dist/migrate.mjs` (usado na imagem Docker)                      |
| `pnpm build:scripts`                       | Migrador, `create-owner.mjs` (roda na imagem) e seed                                    |

## Variáveis de ambiente

| Variável                     | Obrigatória | Descrição                                                                                         |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `LIVEKIT_API_KEY`            | sim         | Chave da API do LiveKit (mesma do servidor LiveKit)                                               |
| `LIVEKIT_API_SECRET`         | sim         | Segredo (32+ caracteres). **Nunca** vai para o navegador                                          |
| `LIVEKIT_URL`                | sim         | `wss://lk.seudominio.com`                                                                         |
| `ACCESS_PASSWORD`            | não         | Se definida, todos precisam dela para entrar (comparação em tempo constante)                      |
| `MAX_PARTICIPANTS`           | não         | Limite por sala, de 2 a 8 (padrão 6)                                                              |
| `REQUIRE_EMAIL_VERIFICATION` | não         | `true` exige confirmar o e-mail antes de entrar em salas (padrão `false`, desligado por enquanto) |
| `DATABASE_URL`               | sim         | Postgres (`postgres://…`), papel `nelcota_app`                                                    |
| `AUTH_SECRET`                | sim         | Segredo das contas de participantes (32+ caracteres)                                              |
| `ADMIN_AUTH_SECRET`          | não         | Liga o `/admin` (32+ caracteres, `openssl rand -base64 48`). Exige banco                          |
| `APP_URL`                    | produção    | Origem pública do app (links de e-mail; obrigatória com o painel ligado)                          |
| `SMTP_URL` / `MAIL_FROM`     | produção    | E-mail transacional (convites, senha). Em dev, sem SMTP, o e-mail vai ao log                      |
| `SENTRY_DSN`                 | não         | Liga o Sentry no servidor (sem dados pessoais)                                                    |
| `PUBLIC_SENTRY_DSN`          | não         | Liga a captura de erros do navegador; carregado em runtime, sem exigir rebuild                    |
| `LOG_LEVEL`                  | não         | Nível do log (padrão `info` em produção, `debug` em dev)                                          |
| `APP_VERSION`                | não         | Definida pela imagem (SHA do commit); aparece no `/api/ready` e no Sentry                         |

Tudo é validado com Zod em `server/env.server.ts`. Se faltar algo, o container sai com código 1 no boot e lista o problema nos logs.

`LIVEKIT_URL` é lida em runtime pelo servidor e devolvida ao navegador junto com o token. Por isso mudar a URL não exige rebuild, e nenhuma variável precisa existir no build.

## Testes

- `tests/unit`: sem banco (domínio puro: decisão do token, regras do mascote, protocolo da sala…).
- `tests/integration`: Postgres real. Com `TEST_DATABASE_URL` (banco **descartável**; em dev ele é lido do `.env.local`), o Vitest recria um banco-modelo já migrado e cada arquivo de teste recebe uma cópia limpa (`CREATE DATABASE … TEMPLATE`). Sem a variável, avisa que só os unitários vão rodar. Um dos testes roda como `nelcota_app` para conferir os grants.
- `tests/e2e`: Playwright com Postgres e LiveKit de dev ligados. Sobe o app em `127.0.0.1:3100` com um banco próprio (`nelcota_e2e`, recriado a cada execução) e Chromium com microfone e tela falsos. Se a porta estiver ocupada, defina `E2E_PORT` no ambiente antes de executar os testes. Instale o navegador uma vez com `pnpm exec playwright install chromium`.

## Formatação nas tarefas de IA

`AGENTS.md` exige que agentes de IA executem `pnpm format` no projeto inteiro após
qualquer alteração, incluindo `components/ui`, e confirmem com `pnpm format:check`
antes de concluir a tarefa. O Oxfmt segue `.oxfmtrc.json` e mantém as exclusões de
dependências, builds e metadados gerados. O CI também verifica a formatação.

## Oxlint

`oxlint.config.ts` é a configuração principal, compatível com o Oxlint 1.87 instalado.
Ela inclui `app`, `components` (também `components/ui`), `features`, `lib`, `server`, testes
e arquivos de configuração. Build, dependências, cobertura e capturas temporárias ficam de fora.

Além da qualidade do código, o lint **impõe a arquitetura** (ver
[guia da arquitetura](README.md) e [`adr/`](adr/)):

- `components/` e `lib/` (genéricos) não importam features, rotas nem o servidor;
- a UI de cada feature não importa servidor, banco nem a UI de outra feature (só o mascote e o
  aviso de compartilhamento são públicos); a regra é gerada por feature a partir de `features/`;
- `features/*/domain` (e `features/admin/*/domain`) são TypeScript puro (sem React, roteador, banco ou SDK);
- `server/` (infra) só conhece o `domain/` das features;
- nenhum arquivo acima de 300 linhas úteis, nenhuma função com complexidade acima de 15.

As regras verificam Hooks e dependências de efeitos, imports circulares e duplicados,
acessibilidade (incluindo `Link`, `Input` e `Label`),
`any` explícito e variáveis sem uso. No modo completo, também verificam Promises sem
tratamento, operações inseguras com tipos e comentários de supressão sem necessidade.
Avisos fazem o comando falhar, inclusive no modo rápido. Parâmetros e variáveis
intencionalmente sem uso podem começar com `_`.

O `typecheck` continua separado (`tsc --noEmit`): não depende do type-check experimental
do Oxlint. `useGSAP` recebe dependências em um objeto de configuração; não é adicionado
a `additionalHooks`, que espera a assinatura com um array de dependências.

As exceções são localizadas: o foco inicial dos popovers de microfone, reações e
compartilhamento permite navegação por teclado. Em `SignUpForm`, a regra de autocomplete
tem uma exceção porque a [implementação do Oxlint 1.86](https://github.com/oxc-project/oxc/blob/oxlint_v1.86.0/crates/oxc_linter/src/rules/jsx_a11y/autocomplete_valid.rs)
omite `nickname`, que é [válido no padrão HTML](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens).
Essa exceção deve ser revista quando o Oxlint for atualizado.

`oxlint.fast.config.mjs` reutiliza a configuração principal e desliga somente o motor
de tipos e a detecção de supressões não utilizadas, pois as supressões de regras de tipos
não podem ser avaliadas nesse modo. Use `pnpm lint:fast` para feedback local rápido;
ele não substitui `pnpm lint` nem `pnpm typecheck`.

Se o Windows apresentar “Controle de Aplicativo bloqueou este arquivo” ao iniciar
`tsgolint.exe`, o lint completo falha por uma restrição do sistema operacional.
Nesse ambiente, é possível rodar `pnpm lint:fast` e `pnpm typecheck` separadamente,
mas a validação das regras type-aware exige um ambiente que permita esse executável.
O [Controle Inteligente de Aplicativos do Windows](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions)
não oferece exceções individuais; em máquinas gerenciadas, consulte o administrador
responsável pela política de aplicativos. Para validação completa em CI, execute `pnpm lint`,
`pnpm typecheck`, `pnpm test` e `pnpm build`.

> Em produção e localmente, `pnpm start` executa o adaptador Express do React Router (`server.mjs --production`). O Docker inclui somente dependências de produção, o build SSR, assets e os scripts de migração.

## Problemas comuns

| Sintoma                                                                   | Causa e solução                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Testes de integração falham com `ECONNREFUSED 127.0.0.1:54329`            | O Postgres de dev não está rodando (acontece depois de reiniciar o Docker). Rode `pnpm db:bootstrap:dev`.                                  |
| E2E da sala falham e o log mostra `falha ao gerar token` (`ECONNREFUSED`) | O LiveKit de dev não está rodando. Rode `docker start lk-dev` (ou o `docker run` acima, na primeira vez).                                  |
| `http://localhost:3000` abre outro app                                    | Outro processo ocupa a porta 3000 em IPv6, e `localhost` resolve primeiro para `::1`. Use `http://127.0.0.1:3000` ou `PORT=3001 pnpm dev`. |
| Porta 3100 ocupada ao rodar o E2E                                         | Defina `E2E_PORT` no ambiente antes de `pnpm test:e2e`.                                                                                    |
