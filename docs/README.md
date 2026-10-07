# Guia da arquitetura atual

O app usa React Router 8 Framework Mode, Vite e SSR. O [README principal](../README.md) descreve desenvolvimento, testes, variáveis e deploy. A decisão de framework está no [ADR 0005](adr/0005-react-router-framework.md).

## Organização

| Pasta                      | Responsabilidade                                                             |
| -------------------------- | ---------------------------------------------------------------------------- |
| `app/routes.ts`            | URLs e hierarquia de layouts explícitas                                      |
| `app/routes/`              | Páginas públicas, conta e sala                                               |
| `app/routes/access/`       | Cadastro, login, recuperação e verificação do participante                   |
| `app/routes/admin/access/` | Login, recuperação, 2FA e convites administrativos                           |
| `app/routes/admin/panel/`  | Páginas administrativas com autorização em cada loader                       |
| `app/routes/api/`          | Adaptadores HTTP e implementações privadas `.server.ts`                      |
| `features/`                | UI, operações, consultas e regras de cada domínio                            |
| `components/`, `lib/`      | UI e utilitários genéricos                                                   |
| `server/`                  | Ambiente, banco, contexto de requisição, logs e infraestrutura compartilhada |
| `tests/`                   | Testes unitários, integração com Postgres e E2E                              |
| `drizzle/`                 | Migrações SQL e metadados versionados                                        |
| `deploy/`                  | Configuração do Postgres e do LiveKit                                        |
| `public/`, `design/`       | Assets usados pelo app e proveniência do mascote                             |

`types/css.d.ts` estende os tipos do React para aceitar variáveis CSS nos estilos dos componentes.

Os nomes de arquivo são em inglês. As URLs e os valores persistidos existentes continuam em português. As rotas são declaradas por caminho em `app/routes.ts`.

Loaders leem dados e autorizam acesso. Actions executam mutações. Operações compartilhadas ficam em `features/*/actions.server.ts`, com descritores públicos em `actions.ts`. O código privado usa `.server.ts`; regras puras ficam em `domain/` ou `engine/`. O build e o Oxlint verificam essas fronteiras.

`node_modules/`, `.react-router/`, `build/`, `dist/`, cobertura e relatórios são gerados pelas ferramentas e ficam fora do Git. `.env.local` guarda a configuração local. As migrações em `drizzle/` fazem parte do código mantido.

## Decisões

- [ADR 0001: organização por feature](adr/0001-pastas-por-feature-e-dal.md) — detalhes específicos do framework substituídos pelo ADR 0005.
- [ADR 0002: gateway do LiveKit](adr/0002-gateway-unico-do-livekit.md).
- [ADR 0003: fronteiras no Oxlint](adr/0003-fronteiras-no-oxlint.md).
- [ADR 0004: idioma e nomes](adr/0004-idioma-e-nomes.md).
- [ADR 0005: React Router Framework Mode](adr/0005-react-router-framework.md).

Os [planos históricos](archive/README.md) preservam o diagnóstico e as decisões das etapas anteriores. Este guia, o README principal e os ADRs descrevem a estrutura atual.
