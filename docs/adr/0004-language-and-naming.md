# ADR 0004 — Code language and naming

- **Status:** accepted (2026-10-06); language policy revised (2026-10-07)
- **Context:** Portuguese folders (`features/salas`) coexisted with English components (`RoomsTable`). `features/usuarios` contained `Participant*`. The `TokenResult` type had two meanings. Later, comments, docs and test names were still in Portuguese, which kept the repository closed to developers who don't read it.

## Decision

- **English**:
  - identifiers, folders, files and internal code keys;
  - code comments, documentation (README, guides, ADRs and plans in `docs/`), test names, log messages and developer-facing errors;
  - commit messages and PR text.
- **Portuguese** (the product is for Brazilian users):
  - UI text and error messages shown to the user (toasts, forms, e-mails, page titles);
  - URLs and parameters (`/sala`, `?convite`, `?voltar`, `de`/`ate`), because they are a contract with people who already have saved links;
  - values already stored in the database or exchanged between systems (for example, `action: "user.export"` in the audit log and the `motivo`/`sala` metadata, cookie names, setting keys). Changing these values is a data change, decided separately.
- **File names**:
  - React components in `PascalCase.tsx`;
  - hooks in `use-*.ts`;
  - everything else in `kebab-case.ts`;
  - documents (ADRs, guides and plans in `docs/`) in `kebab-case.md`.
- **Domain terms**: `participant` is the person who joins rooms (`users` table); `admin` is the panel account. `TokenFetchResult` (the result of the request in the browser) is different from the record in `token_requests`.
- **No barrel files.** Imports point directly at the file, with the `@/` alias.
