# Nelcota — compartilhamento de tela

App web de compartilhamento de tela para times pequenos (~5 pessoas), com React Router 8 (Framework Mode, evolução do Remix para React) e LiveKit self-hosted. Dark mode, animações em GSAP e deploy via Coolify em uma VPS.

- Home → criar sala ou entrar com código → pré-entrada (nome, senha opcional, teste de microfone) → sala
- Compartilhar a tela com áudio da aba/sistema (quando o navegador permite), microfone, indicador de quem fala, copiar link
- Token JWT gerado no servidor (`POST /api/token`), com TTL curto, senha opcional, limite de pessoas e rate limit por IP

## Stack

| Área              | Versão                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Node.js           | 26.9 (`node:26.9.0-alpine`)                                                                           |
| Framework         | React Router 8.4, Vite 8.3, SSR e React Compiler                                                      |
| React             | 19.3                                                                                                  |
| TypeScript        | 7.0 (compilador nativo; `pnpm typecheck` gera os tipos de rota e roda o compilador)                   |
| Lint / formatação | Oxlint + `oxlint-tsgolint` (type-aware) / Oxfmt (com ordenação de classes Tailwind)                   |
| UI                | Tailwind CSS 4.3 (CSS-first, tokens em `app/globals.css`), shadcn/ui, lucide-react, Manrope           |
| Tempo real        | `livekit-client`, `@livekit/components-react`, `livekit-server-sdk`, `livekit/livekit-server:v1.13.7` |
| Animação          | GSAP 3.15 + `@gsap/react` (Flip, CustomEase)                                                          |
| Validação         | Zod 4                                                                                                 |

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

### Scripts

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

### Formatação nas tarefas de IA

`AGENTS.md` exige que agentes de IA executem `pnpm format` no projeto inteiro após
qualquer alteração, incluindo `components/ui`, e confirmem com `pnpm format:check`
antes de concluir a tarefa. O Oxfmt segue `.oxfmtrc.json` e mantém as exclusões de
dependências, builds e metadados gerados. O CI também verifica a formatação.

### Oxlint

`oxlint.config.ts` é a configuração principal, compatível com o Oxlint 1.87 instalado.
Ela inclui `app`, `components` (também `components/ui`), `features`, `lib`, `server`, testes
e arquivos de configuração. Build, dependências, cobertura e capturas temporárias ficam de fora.

Além da qualidade do código, o lint **impõe a arquitetura** (ver
[`docs/README.md`](docs/README.md) e `docs/adr/`):

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

## Atalhos na sala

| Tecla | Ação                                                  |
| ----- | ----------------------------------------------------- |
| `M`   | Liga e desliga o microfone                            |
| `S`   | Abre o menu de compartilhar (ou para de compartilhar) |
| `F`   | Tela cheia no palco                                   |
| `P`   | Apontar na tela de outra pessoa (todos veem o ponto)  |
| `H`   | Levantar ou baixar a mão                              |
| `C`   | Abre e fecha o chat                                   |
| `E`   | Sair da sala (pede confirmação)                       |

Os atalhos não disparam enquanto você digita no chat ou em outro campo.

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

## Banco de dados e painel admin

O app usa **PostgreSQL 18** com **[Drizzle ORM](https://orm.drizzle.team)** (`drizzle-orm` + driver `pg`). O plano original do painel está preservado no [arquivo histórico](docs/archive/admin-plan.md); a arquitetura atual está em [docs/README.md](docs/README.md).

- O schema fica em `server/db/schema/` (um arquivo por área). Depois de mudar o schema, rode `pnpm db:generate`, revise o SQL e faça commit dele em `drizzle/`. O CI falha se o schema e as migrações não baterem.
- **Migrações nunca rodam no boot do app.** São um job separado (`scripts/migrate.ts`), com um usuário próprio do Postgres, advisory lock e `lock_timeout` de 5 s. Mudanças seguem _expand/contract_ (o código antigo continua funcionando com o schema novo).
- Configurações editáveis ficam em `app_settings` (uma linha por grupo, valor JSON validado por Zod em `features/admin/settings/server/settings.server.ts`). Um grupo novo de configuração não precisa de migração.
- `DATABASE_URL` é obrigatória: entrar numa sala exige conta.
- **Retenção (LGPD) e reprocessamento:** a cada 6 h o próprio processo do app (`features/runtime/server/maintenance.server.ts`) apaga pedidos de token com mais de 6 meses, tira o IP das participações com mais de 6 meses e o nome com mais de 12, apaga eventos do LiveKit e falhas de login com mais de 30 dias e sessões vencidas há 7 dias, e reprojeta eventos do webhook que falharam.

### Papéis do Postgres (privilégio mínimo)

| Papel              | Pode                                        | Quem usa                           |
| ------------------ | ------------------------------------------- | ---------------------------------- |
| `nelcota_migrator` | dono do schema; DDL                         | job de migração (segredo só no CI) |
| `nelcota_app`      | ler e escrever dados; **sem DDL**; timeouts | o app (`DATABASE_URL`)             |
| `nelcota_readonly` | só leitura + estatísticas                   | diagnóstico e teste de restauração |

Os papéis são criados uma vez com `deploy/postgres/bootstrap.sql` (idempotente). Em dev, o `docker-compose.dev.yml` roda o bootstrap sozinho com senhas fixas de desenvolvimento.

### Testes

- `tests/unit`: sem banco (domínio puro: decisão do token, regras do mascote, protocolo da sala…).
- `tests/integration`: Postgres real. Com `TEST_DATABASE_URL` (banco **descartável**; em dev ele é lido do `.env.local`), o Vitest recria um banco-modelo já migrado e cada arquivo de teste recebe uma cópia limpa (`CREATE DATABASE … TEMPLATE`). Sem a variável, avisa que só os unitários vão rodar. Um dos testes roda como `nelcota_app` para conferir os grants.
- `tests/e2e`: Playwright com Postgres e LiveKit de dev ligados. Sobe o app em `127.0.0.1:3100` com um banco próprio (`nelcota_e2e`, recriado a cada execução) e Chromium com microfone e tela falsos. Se a porta estiver ocupada, defina `E2E_PORT` no ambiente antes de executar os testes. Instale o navegador uma vez com `pnpm exec playwright install chromium`.

### Contas de participantes

Entrar numa sala (e criar uma) exige **conta** (e e-mail confirmado, se `REQUIRE_EMAIL_VERIFICATION=true`). É uma segunda instância do Better Auth em `/api/auth` (tabelas `users*`, cookie `nelcota.*`, `SameSite=Lax`), separada do painel admin.

- **Cadastro:** nome de exibição, e-mail e senha (10 a 128 caracteres, argon2id) e aceite do [aviso de privacidade](/privacidade). Cadastrar um e-mail que já existe responde igual a um cadastro novo, e o dono do e-mail recebe um aviso.
- **Confirmação de e-mail** opcional (`REQUIRE_EMAIL_VERIFICATION`, desligada por padrão; link de 24 h; em dev o link aparece no log do servidor). Depois de confirmar, a pessoa já entra e volta para onde estava (ex.: a sala).
- **Na sala:** a identidade no LiveKit é o ID da conta e o nome vem da conta (o token não deixa trocar o nome lá dentro; "levantar a mão" passa pelo servidor em `POST /api/sala/mao`). A mesma conta numa segunda aba desconecta a primeira, com aviso.
- **Minha conta (`/conta`):** perfil (foto, nome e e-mail), segurança (senha e 2FA), dispositivos conectados e privacidade (exportação dos dados e exclusão da conta). A foto aceita JPG, PNG e WebP de até 5 MB, com prévia antes de salvar; é recortada ao centro e reduzida para um avatar de 256 × 256 px. A troca de e-mail precisa de confirmação no novo endereço. A exclusão anonimiza a conta imediatamente.
- Mesmas proteções do admin: bloqueio por tentativas, rate limit no banco, checagem de origem e mensagens que não revelam se o e-mail existe. Conta bloqueada pelo painel não entra nem abre sessão.

### Painel `/admin`

O painel usa uma **instância própria do [Better Auth](https://www.better-auth.com)** em `/api/admin/auth` (tabelas `admin_*`, cookie `nelcota-admin.*`), separada de qualquer conta de participante.

- **Só por convite:** não existe cadastro público nem senha padrão. O primeiro dono é criado com o script abaixo; os demais admins são convidados pelo painel.
- **Senha:** argon2id (OWASP: 19 MiB, 2 iterações), 12 a 128 caracteres.
- **2FA TOTP obrigatório** para `owner` e `admin` (app autenticador + 10 códigos de backup de uso único). Sem 2FA, a sessão só acessa a tela de configurá-lo.
- **Sessão no banco** (sem cache em cookie): expira em 12 h sem uso, máximo absoluto de 7 dias, cookie `HttpOnly` + `Secure` + `SameSite=Strict`. Ações críticas pedem login nos últimos 10 min.
- **Bloqueio por tentativas:** 5 senhas erradas na mesma conta bloqueiam por 15 min (dobra a cada 5, até 24 h); 20 erros do mesmo IP em 15 min bloqueiam o IP. Mais o rate limit do Better Auth (5 logins/min por IP), guardado no banco.
- **Sem enumeração:** login, recuperação de senha e convite respondem igual exista o e-mail ou não.
- **CSRF:** o Better Auth confere a origem; além disso, a rota recusa qualquer requisição de outra origem (inclusive o primeiro login, sem cookie).
- **Permissões:** papéis `owner`, `admin` e `viewer` em `features/auth/server/permissions.server.ts` (matriz em `docs/archive/admin-plan.md` §5.2). Cada loader protegido chama `requireAdmin(...)`. As operações do painel passam por `defineAdminOperation` (sessão, 2FA, permissão e sessão fresca conferidas no servidor).

- **Auditoria:** `audit_logs` guarda quem fez o quê, quando, de onde (IP, navegador, `request_id`) e o "antes → depois" campo a campo, com segredos mascarados. É gravado na **mesma transação** da mudança. A tabela é imutável (trigger + papel do app sem UPDATE/DELETE; apagar só depois de 5 anos). Toda operação declara `audit: "required" | "none"`; uma operação auditada que termina sem registrar falha. Logins, bloqueios, 2FA e trocas de senha do painel também são registrados.
- **Shell:** sidebar recolhível (lembrada em cookie), breadcrumbs, busca/command palette (`Ctrl/⌘ K`), estados de carregamento, erro e 404 em pt-BR. O menu mostra só o que o papel pode abrir.
- **Testes de segurança:** um teste importa todas as operações do painel e confere que nenhuma roda sem sessão; outro confere que todo loader de página protegida chama `requireAdmin`.

**Criar o primeiro dono:**

```bash
# Dev
pnpm admin:create-owner dono@exemplo.com
# Produção (container do app no Coolify → Terminal, ou via SSH)
docker exec -it <container-do-app> node create-owner.mjs dono@exemplo.com
```

O comando imprime um link de uso único, válido por 30 minutos. Se o único dono perder o 2FA e os códigos de backup, rode de novo com `--force` para gerar outro convite de dono.

## Deploy no Coolify

Você vai criar dois recursos no mesmo servidor: o LiveKit e o app.

### 0. DNS e chaves

1. Crie dois registros A apontando para o IP da VPS:
   - `app.seudominio.com` → app React Router
   - `lk.seudominio.com` → LiveKit (sinalização + TURN)

   Se usar Cloudflare, deixe o `lk.` como DNS only (nuvem cinza). TURN e WebRTC precisam do IP real.

2. Gere um par de chaves:

   ```bash
   docker run --rm livekit/livekit-server:v1.13.7 generate-keys
   # ou: echo "API$(openssl rand -hex 6)"  e  openssl rand -base64 48
   ```

### 1. Firewall da VPS

```bash
ufw allow 7881/tcp           # WebRTC via TCP (fallback)
ufw allow 50000:50100/udp    # mídia WebRTC
ufw allow 3478/udp           # TURN/UDP
ufw allow 30000:30100/udp    # portas de relay do TURN
ufw allow 5349/tcp           # TURN/TLS (só se ativar, ver abaixo)
```

**Não** abra a 7880: ela passa pelo proxy HTTPS do Coolify. Se o provedor tiver firewall próprio (Hetzner, AWS etc.), libere as mesmas portas lá também.

### 2. Recurso LiveKit (Docker Compose)

1. - New Resource → Docker Compose apontando para este repositório.
2. Em _Docker Compose Location_, use `/docker-compose.livekit.yml`.
3. Edite `deploy/livekit/livekit.yaml` e troque `lk.seudominio.com` pelo seu domínio (`turn.domain`).
4. Em Environment Variables, defina `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`.
5. Não preencha domínio no serviço. Com `network_mode: host`, o proxy não descobre o container por labels; a rota é criada no passo 3.
6. Deploy. Nos logs deve aparecer `starting LiveKit server` com `rtc.portICERange: [50000, 50100]` e `Starting TURN server`.

### 3. Proxy HTTPS para `lk.seudominio.com` → 7880

Em Servers → (seu servidor) → Proxy → Dynamic Configurations, adicione um arquivo `livekit.yaml` (Traefik):

```yaml
http:
  routers:
    livekit-http:
      rule: Host(`lk.seudominio.com`)
      entryPoints: [http]
      middlewares: [livekit-https]
      service: livekit
    livekit:
      rule: Host(`lk.seudominio.com`)
      entryPoints: [https]
      service: livekit
      tls:
        certResolver: letsencrypt
  middlewares:
    livekit-https:
      redirectScheme:
        scheme: https
  services:
    livekit:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:7880
```

O proxy do Coolify já resolve `host.docker.internal` para o host. Se não resolver no seu servidor, use o gateway da bridge do Docker (`http://172.17.0.1:7880`) e permita o tráfego dos containers até a 7880:

```bash
ufw allow from 172.16.0.0/12 to any port 7880 proto tcp
ufw allow from 10.0.0.0/8 to any port 7880 proto tcp
```

Para testar: `curl https://lk.seudominio.com` deve responder `OK`.

### 4. Recurso App (imagem do GHCR)

A imagem é construída no **GitHub Actions** (não na VPS, para não disputar CPU e memória com o app) e publicada no GHCR com duas tags: `:<sha>` (imutável) e `:main`.

1. No Coolify: New Resource → **Docker Image** → `ghcr.io/<org>/<repo>:main` (com credencial de leitura do GHCR). Ports Exposes: `3000`. Domains: `https://app.seudominio.com`.
2. Environment Variables (runtime):

   ```
   DATABASE_URL=postgres://nelcota_app:<senha>@<host-interno-do-postgres>:5432/nelcota
   LIVEKIT_API_KEY=<mesma do LiveKit>
   LIVEKIT_API_SECRET=<mesmo do LiveKit>
   LIVEKIT_URL=wss://lk.seudominio.com
   ACCESS_PASSWORD=<opcional>
   MAX_PARTICIPANTS=6
   SENTRY_DSN=<opcional>
   AUTH_SECRET=<openssl rand -base64 48>
   ADMIN_AUTH_SECRET=<outro openssl rand -base64 48; liga o /admin>
   APP_URL=https://app.seudominio.com
   SMTP_URL=smtps://usuario:senha@smtp.seudominio.com:465
   MAIL_FROM=Nelcota <no-reply@seudominio.com>
   ```

   Sem `APP_URL`, `SMTP_URL` e `MAIL_FROM`, o app recusa subir em produção (`server/env.server.ts`).

3. Mantenha o rolling update ligado (sem mapear porta do host nem nome fixo de container). O `HEALTHCHECK` do Dockerfile consulta `/api/health`; o container roda como usuário não-root (`nelcota`).

**Pipeline** (`.github/workflows`): `ci.yml` roda formatação, lint, tipos, `pnpm audit`, testes (com Postgres 18.6) e build em todo PR. Na `main`, `deploy.yml` faz: imagem no GHCR → **migração** (SSH na VPS, `docker run` da imagem nova com o usuário de migração) → webhook do Coolify → espera o `/api/ready` responder com o SHA novo. Se a migração falhar, nada é deployado.

Segredos do GitHub (environment `production`): `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`, `MIGRATOR_DATABASE_URL`, `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN`. Variáveis: `APP_URL`, `DEPLOY_DOCKER_NETWORK` (padrão `coolify`), `PUBLIC_SENTRY_DSN` (opcional). No servidor, o usuário de deploy precisa de `docker login ghcr.io` uma vez.

> O rate limit fica em memória: vale para uma réplica (o padrão no Coolify). Para escalar horizontalmente, troque por Redis.
>
> O IP usado no rate limit é o do `X-Forwarded-For` contado a partir do fim, conforme `TRUSTED_PROXY_HOPS` (Traefik = 1). Se o `app.` passar também pelo proxy da Cloudflare, use `TRUSTED_PROXY_HOPS=2`.
>
> **Rollback:** a tag `:main` muda a cada deploy. Para voltar uma versão, aponte o recurso para `ghcr.io/<org>/<repo>:<sha-anterior>` (tag imutável) e faça redeploy; as migrações são sempre aditivas (expand/contract), então o código anterior funciona com o schema novo.

### 4.1. PostgreSQL

1. No Coolify, crie um recurso **PostgreSQL** com a imagem `postgres:18.6-alpine`, no mesmo projeto e servidor do app. **Não** torne a porta pública.
2. Em "Custom PostgreSQL configuration", cole `deploy/postgres/postgresql.conf` (ele **substitui** o arquivo inteiro; os valores estão comentados para VPS de 4 e 8 GB). Reinicie o banco.
3. Rode o bootstrap uma vez com o superusuário (instruções no topo de `deploy/postgres/bootstrap.sql`) e guarde as três senhas geradas.
4. `DATABASE_URL` do App usa `nelcota_app`; `MIGRATOR_DATABASE_URL` (segredo do GitHub) usa `nelcota_migrator`. Ambas com o host **interno** do Postgres.
5. Ative os backups agendados do Coolify para um S3 compatível (diário, 03:00).

### 5. TURN/TLS (opcional, para redes muito restritivas)

O TURN/UDP (3478) já vem ativo. O TURN/TLS na 5349 atravessa firewalls que só deixam passar TLS, mas precisa de um certificado válido para o `turn.domain`:

1. Gere o certificado por desafio DNS, já que a porta 80 é do proxy:
   `certbot certonly --manual --preferred-challenges dns -d lk.seudominio.com`
   (ou use o plugin do seu provedor DNS, para ter renovação automática).
2. Em `deploy/livekit/livekit.yaml`, descomente `tls_port`, `cert_file` e `key_file`.
3. Em `docker-compose.livekit.yml`, descomente o volume dos certificados.
4. Libere `5349/tcp` e faça o redeploy.

### 6. Webhook (salas e participações no painel)

O app recebe os eventos do LiveKit em `POST /api/livekit/webhook`. Cada evento é gravado em `livekit_events` (o id do evento impede duplicatas) e projetado em `rooms`, `room_participations` e `share_sessions`, que alimentam o painel admin. A projeção aceita eventos repetidos e fora de ordem. A assinatura é conferida com `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`: sem ela, a rota responde 401. Com o banco fora do ar, responde 503 e o LiveKit tenta de novo.

1. Em `deploy/livekit/livekit.yaml`, troque `api_key` no bloco `webhook` pelo valor de `LIVEKIT_API_KEY` e a URL pelo domínio do app.
2. Faça o redeploy do LiveKit.
3. Confira: entre numa sala e veja `select event, processed_at, error from livekit_events order by received_at desc limit 5;`.

Em desenvolvimento, `deploy/livekit/livekit.dev.yaml` aponta o webhook para `http://host.docker.internal:3000` (veja o topo do arquivo).

Cada pedido ao `/api/token` também fica em `token_requests` (resultado, conta e IP), que liga cada entrada ao IP de origem.

## Testando em produção

### Duas redes diferentes

1. Computador A no Wi-Fi de casa/escritório; computador ou celular B no 4G (roteador do celular).
2. Os dois entram na mesma sala. A compartilha a tela; B deve ver o palco em segundos.
3. Teste também com uma rede corporativa/VPN, que é onde o TURN costuma ser necessário.

### Conferindo candidatos `relay` (TURN)

1. No Chrome, abra `chrome://webrtc-internals` **antes** de entrar na sala.
2. Entre e compartilhe a tela. Na conexão `RTCPeerConnection`, abra Stats Tables e procure o `candidate-pair` com `state: succeeded` / `nominated: true`.
3. Veja o `remote-candidate` / `local-candidate` desse par:
   - `candidateType: host` ou `srflx` → conexão direta via UDP (ideal);
   - `candidateType: relay` → passou pelo TURN.
4. Para **forçar** o teste do TURN, bloqueie temporariamente a mídia direta na VPS e reconecte:

   ```bash
   ufw deny 50000:50100/udp && ufw deny 7881/tcp
   # entre na sala: o par nominado deve ser "relay"
   ufw delete deny 50000:50100/udp && ufw delete deny 7881/tcp
   ```

   Se não conectar com essas portas bloqueadas, revise `3478/udp`, `30000-30100/udp` e o `turn.domain`.

5. Pelo servidor: nos logs do LiveKit, a linha `participant active` de cada pessoa traz `connectionType` (`udp`/`tcp`) e a lista `publisherCandidates`. O candidato marcado com `[remote][selected:1]` mostra o tipo usado (`host`, `srflx` ou `relay`).

## Estrutura

Organização por feature (guia em [docs/README.md](docs/README.md), decisões em `docs/adr/`):

```
app/
  routes.ts               # URLs e hierarquia explícitas
  routes/                 # páginas e endpoints: loaders/actions finos que chamam as features
    access/               # acesso do participante
    admin/{access,panel}/ # acesso e painel administrativo
    api/                  # endpoints, espelhando a URL (account/, admin/, room/)
  operations.server.ts    # registro das operações chamadas pelo navegador (/api/operations/:id)
  root.tsx                # documento HTML, providers e dados globais
  entry.{client,server}.tsx
  globals.css fonts.css
features/<nome>/          # mesmo padrão em todas (só as subpastas necessárias):
  domain/                 #   TypeScript puro, testado em tests/unit
  server/                 #   consultas, mutações e handlers das rotas de API (.server.ts)
  client/                 #   código do navegador fora do React
  hooks/ ui/              #   React
  actions.ts              #   descritores públicos das operações (actions.server.ts no servidor)
features/
  room/                   # sala ao vivo (token, webhook, presença, pré-entrada, chamada, dock)
  mascot/                 # o Nelcota: domain/ (regras), client/ (controladores e eventos), ui/
  auth/                   # as duas instâncias do Better Auth, sessões, permissões e telas de acesso
  security/               # sessões e 2FA, usados pela conta e pelo painel
  account/                # "Minha conta" do participante e operações sobre contas
  admin/                  # painel: rooms, participants, shares, audit, search, settings, shell
  home/ privacy/          # página inicial e página de privacidade
  runtime/                # inicialização do servidor e manutenção a cada 6 h (retenção LGPD)
components/               # UI genérica: ui/ (shadcn), shell/ (cabeçalho, navbar, tema), data-table/
lib/                      # utilitários isomórficos: operations/, animation/, hooks/
server/                   # só infra: env, db (schema), logger, mail, rate limit, CSP, origem,
                          # contexto por requisição, rotas de API, operações, auditoria, tabelas
scripts/                  # migrate, create-owner, seed
drizzle/                  # migrações SQL geradas (commitadas)
deploy/                   # Postgres (conf, papéis) e LiveKit
tests/{unit,integration,e2e}/
.github/workflows/        # CI (qualidade, testes, E2E, build e imagem) e deploy
docs/                     # guia atual, ADRs e planos históricos em archive/
public/                   # favicon, ícone, robots e atlas do mascote
design/                   # proveniência do atlas aprovado
```
