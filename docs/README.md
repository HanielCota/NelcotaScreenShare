# Guia da arquitetura atual

O app usa React Router 8 Framework Mode, Vite e SSR. O [README principal](../README.md) descreve desenvolvimento, testes, variáveis e deploy. A decisão de framework está no [ADR 0005](adr/0005-react-router-framework.md).

## Organização

| Pasta                      | Responsabilidade                                                          |
| -------------------------- | ------------------------------------------------------------------------- |
| `app/routes.ts`            | URLs e hierarquia de layouts explícitas                                   |
| `app/routes/`              | Páginas públicas, conta e sala                                            |
| `app/routes/access/`       | Cadastro, login, recuperação e verificação do participante                |
| `app/routes/admin/access/` | Login, recuperação, 2FA e convites administrativos                        |
| `app/routes/admin/panel/`  | Páginas administrativas com autorização em cada loader                    |
| `app/routes/api/`          | Endpoints finos (`apiLoader`/`apiAction`), espelhando a URL               |
| `app/operations.server.ts` | Registro das operações chamadas pelo navegador                            |
| `features/`                | UI, operações, consultas, handlers de API e regras de cada domínio        |
| `components/`, `lib/`      | UI e utilitários genéricos (`components/shell/`: cabeçalho, navbar, tema) |
| `server/`                  | Só infraestrutura: ambiente, banco, requisição, logs, rotas e operações   |
| `tests/`                   | Testes unitários, integração com Postgres e E2E                           |
| `drizzle/`                 | Migrações SQL e metadados versionados                                     |
| `deploy/`                  | Configuração do Postgres e do LiveKit                                     |
| `public/`, `design/`       | Assets usados pelo app e proveniência do mascote                          |

`types/css.d.ts` estende os tipos do React para aceitar variáveis CSS nos estilos dos componentes.

Os nomes de arquivo são em inglês. As URLs e os valores persistidos existentes continuam em português. As rotas são declaradas por caminho em `app/routes.ts`.

Loaders leem dados e autorizam acesso. Actions executam mutações. Operações compartilhadas ficam em `features/*/actions.server.ts`, com descritores públicos em `actions.ts`. O código privado usa `.server.ts`; regras puras ficam em `domain/`. O build e o Oxlint verificam essas fronteiras.

Toda feature segue o mesmo padrão, com só as subpastas de que precisa: `domain/` (TypeScript puro), `server/` (consultas, mutações e handlers das rotas de API), `client/` (navegador, fora do React), `hooks/` e `ui/` (React), e `actions.ts`/`actions.server.ts` na raiz. As subfeatures do painel (`features/admin/*`) seguem o mesmo padrão. A rota de API só liga a URL ao handler da feature:

```ts
export const action = apiAction(requestRoomToken);
```

O mecanismo das operações tem um lugar por papel: descritor e hook em `lib/operations/`, validação, erros e despacho HTTP em `server/operations/`, políticas de acesso (admin, participante, público) em `features/auth/server/operation-policies.server.ts` e o registro em `app/operations.server.ts`.

`node_modules/`, `.react-router/`, `build/`, `dist/`, cobertura e relatórios são gerados pelas ferramentas e ficam fora do Git. `.env.local` guarda a configuração local. As migrações em `drizzle/` fazem parte do código mantido.

## Decisões

- [ADR 0001: organização por feature](adr/0001-feature-folders-and-dal.md) — detalhes específicos do framework substituídos pelo ADR 0005.
- [ADR 0002: gateway do LiveKit](adr/0002-single-livekit-gateway.md).
- [ADR 0003: fronteiras no Oxlint](adr/0003-oxlint-boundaries.md).
- [ADR 0004: idioma e nomes](adr/0004-language-and-naming.md).
- [ADR 0005: React Router Framework Mode](adr/0005-react-router-framework.md).

Os [planos históricos](archive/README.md) preservam o diagnóstico e as decisões das etapas anteriores. Este guia, o README principal e os ADRs descrevem a estrutura atual.
