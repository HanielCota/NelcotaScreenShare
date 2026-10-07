# ADR 0005 — React Router Framework Mode no lugar do Next

- **Status:** aceita (2026-10-06)
- **Contexto:** manter React, as salas do LiveKit e as contas existentes, removendo a dependência do Next. O caminho atual do Remix para aplicações React é o React Router em Framework Mode.

## Decisão

- React Router 8.4, Vite 8.3, React 19.3 e React Compiler, com SSR em Node 26.9 e adaptador Express 5.
- Rotas explícitas em `app/routes.ts`, com módulos em `app/routes/`: páginas públicas, `access/`, `admin/access/`, `admin/panel/` e `api/`. Arquivos têm nomes em inglês; URLs existentes continuam em português. Cada endpoint mantém sua implementação privada em um arquivo `.server.ts` ao lado do módulo de rota.
- Loaders fazem leitura e autorização no servidor. Cada loader protegido autoriza seus próprios dados porque loaders de layout e de página podem executar em paralelo.
- Módulos `.server.ts` guardam banco, autenticação, configuração e mutações. O build recusa imports desses módulos pelo navegador.
- A UI recebe DTOs com apenas os campos necessários. A senha de acesso à sala fica no servidor; o loader envia somente `passwordRequired`.
- Operações usam `useFetcher`, Zod e políticas explícitas de sessão, 2FA, permissão, login recente e auditoria. GET é reservado à busca; mutações exigem POST e origem confiável. Aceite de convite e exclusão de conta redirecionam no servidor.
- `AsyncLocalStorage` e o contexto do roteador limitam a memorização de sessão à mesma requisição. Não há cache global de usuários.
- Better Auth, hashes Argon2id, cookies, tabelas e migrações existentes são mantidos. A migração de framework não altera o schema.
- LiveKit e GSAP Flip entram em um chunk carregado depois da pré-entrada. A fonte Manrope é hospedada pelo app.
- Sentry usa o SDK de React Router, com captura nos entries e coleta de dados pessoais desativada. DSNs são opcionais e lidos em runtime.
- SIGTERM/SIGINT encerram requisições, manutenção, pool do Postgres e transporte de observabilidade antes da saída.

## Dependências e compatibilidade

As dependências diretas foram conferidas no registro. Babel permanece na versão 7.29.7 porque o SDK Sentry 11.4 exige Babel 7; atualizar para Babel 8 agora quebraria esse contrato. O lockfile fixa as versões resolvidas, a instalação não acrescenta peers opcionais como Next, e os peers obrigatórios são declarados no projeto.

## Consequências

- Não há `next`, `next-safe-action`, APIs de cache do Next nem adapter Next do Nuqs no runtime.
- `pnpm dev` e `pnpm start` executam `server.mjs`. O Docker inclui o build SSR e as dependências de produção, sem servidor de desenvolvimento.
- Deploys existentes precisam renomear `NEXT_PUBLIC_LIVEKIT_URL` para `LIVEKIT_URL` e, se usado, `NEXT_PUBLIC_SENTRY_DSN` para `PUBLIC_SENTRY_DSN`. Os segredos de autenticação e o banco permanecem os mesmos.
- Este ADR substitui as decisões específicas de Next/RSC/next-safe-action do ADR 0001 e dos planos anteriores em `docs/archive/refactor/`. As fronteiras por feature e as regras de domínio continuam válidas.
- Os testes de integração continuam usando bancos descartáveis. Os E2E executam o build de produção por padrão; `E2E_DEV=true` permite verificar o servidor Vite.

Referências: [Framework Mode](https://reactrouter.com/start/framework/installation), [loaders](https://reactrouter.com/start/framework/data-loading), [actions](https://reactrouter.com/start/framework/actions), [relato de erros](https://reactrouter.com/how-to/error-reporting).
