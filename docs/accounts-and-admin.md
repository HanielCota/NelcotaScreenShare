# Contas, painel admin e banco

Como funcionam as contas de participantes, o painel `/admin`, a auditoria e o PostgreSQL. A organização do código está no [guia da arquitetura](README.md).

## Banco de dados

O app usa **PostgreSQL 18** com **[Drizzle ORM](https://orm.drizzle.team)** (`drizzle-orm` + driver `pg`). O plano original do painel está preservado no [arquivo histórico](archive/admin-plan.md); a arquitetura atual está no [guia da arquitetura](README.md).

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

## Contas de participantes

Entrar numa sala (e criar uma) exige **conta** (e e-mail confirmado, se `REQUIRE_EMAIL_VERIFICATION=true`). É uma segunda instância do Better Auth em `/api/auth` (tabelas `users*`, cookie `nelcota.*`, `SameSite=Lax`), separada do painel admin.

- **Cadastro:** nome de exibição, e-mail e senha (8 a 128 caracteres, argon2id) e aceite do [aviso de privacidade](../app/routes/privacy.tsx). Cadastrar um e-mail que já existe responde igual a um cadastro novo, e o dono do e-mail recebe um aviso.
- **Confirmação de e-mail** opcional (`REQUIRE_EMAIL_VERIFICATION`, desligada por padrão; link de 24 h; em dev o link aparece no log do servidor). Depois de confirmar, a pessoa já entra e volta para onde estava (ex.: a sala).
- **Na sala:** a identidade no LiveKit é o ID da conta e o nome vem da conta (o token não deixa trocar o nome lá dentro; "levantar a mão" passa pelo servidor em `POST /api/sala/mao`). A mesma conta numa segunda aba desconecta a primeira, com aviso.
- **Minha conta (`/conta`):** perfil (foto, nome e e-mail), segurança (senha e 2FA), dispositivos conectados e privacidade (exportação dos dados e exclusão da conta). A foto aceita JPG, PNG e WebP de até 5 MB, com prévia antes de salvar; é recortada ao centro e reduzida para um avatar de 256 × 256 px. A troca de e-mail precisa de confirmação no novo endereço. A exclusão anonimiza a conta imediatamente.
- Mesmas proteções do admin: bloqueio por tentativas, rate limit no banco, checagem de origem e mensagens que não revelam se o e-mail existe. Conta bloqueada pelo painel não entra nem abre sessão.

## Painel `/admin`

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
