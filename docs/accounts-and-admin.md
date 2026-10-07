# Accounts, admin panel and database

How participant accounts, the `/admin` panel, the audit log and PostgreSQL work. The code layout is in the [architecture guide](README.md).

## Database

The app uses **PostgreSQL 18** with **[Drizzle ORM](https://orm.drizzle.team)** (`drizzle-orm` + the `pg` driver). The original panel plan is preserved in the [historical archive](archive/admin-plan.md); the current architecture is in the [architecture guide](README.md).

- The schema lives in `server/db/schema/` (one file per area). After changing the schema, run `pnpm db:generate`, review the SQL and commit it in `drizzle/`. CI fails if the schema and the migrations don't match.
- **Migrations never run at app boot.** They are a separate job (`scripts/migrate.ts`), with its own Postgres user, an advisory lock and a 5 s `lock_timeout`. Changes follow _expand/contract_ (the old code keeps working with the new schema).
- Editable settings live in `app_settings` (one row per group, a JSON value validated by Zod in `features/admin/settings/server/settings.server.ts`). A new settings group doesn't need a migration.
- `DATABASE_URL` is required: joining a room requires an account.
- **Retention (LGPD) and reprocessing:** every 6 h the app process itself (`features/runtime/server/maintenance.server.ts`) deletes token requests older than 6 months, strips the IP from participations older than 6 months and the name from those older than 12, deletes LiveKit events and login failures older than 30 days and sessions expired for 7 days, and re-projects webhook events that failed.

### Postgres roles (least privilege)

| Role               | Can                                       | Used by                           |
| ------------------ | ----------------------------------------- | --------------------------------- |
| `nelcota_migrator` | owns the schema; DDL                      | migration job (secret only in CI) |
| `nelcota_app`      | read and write data; **no DDL**; timeouts | the app (`DATABASE_URL`)          |
| `nelcota_readonly` | read only + statistics                    | diagnostics and restore testing   |

The roles are created once with `deploy/postgres/bootstrap.sql` (idempotent). In dev, `docker-compose.dev.yml` runs the bootstrap by itself with fixed development passwords.

## Participant accounts

Joining a room (and creating one) requires an **account** (and a confirmed e-mail, if `REQUIRE_EMAIL_VERIFICATION=true`). It is a second Better Auth instance at `/api/auth` (`users*` tables, `nelcota.*` cookie, `SameSite=Lax`), separate from the admin panel.

- **Sign-up:** display name, e-mail and password (8 to 128 characters, argon2id) and acceptance of the [privacy notice](../app/routes/privacy.tsx). Signing up with an e-mail that already exists gets the same response as a new sign-up, and the e-mail's owner receives a notice.
- Optional **e-mail confirmation** (`REQUIRE_EMAIL_VERIFICATION`, off by default; 24 h link; in dev the link shows up in the server log). After confirming, the person is signed in and returns to where they were (e.g. the room).
- **In the room:** the LiveKit identity is the account ID and the name comes from the account (the token doesn't allow changing the name inside the room; "levantar a mão" ("raise hand") goes through the server at `POST /api/sala/mao`). The same account in a second tab disconnects the first one, with a notice.
- **My account (`/conta`):** profile (photo, name and e-mail), security (password and 2FA), connected devices and privacy (data export and account deletion). The photo accepts JPG, PNG and WebP up to 5 MB, with a preview before saving; it is center-cropped and scaled down to a 256 × 256 px avatar. Changing the e-mail requires confirmation at the new address. Deletion anonymizes the account immediately.
- Same protections as the admin: lockout after failed attempts, rate limiting in the database, origin checks and messages that don't reveal whether the e-mail exists. An account blocked from the panel can neither sign in nor open a session.

## `/admin` panel

The panel uses its **own [Better Auth](https://www.better-auth.com) instance** at `/api/admin/auth` (`admin_*` tables, `nelcota-admin.*` cookie), separate from any participant account.

- **Invitation only:** there is no public sign-up and no default password. The first owner is created with the script below; other admins are invited from the panel.
- **Password:** argon2id (OWASP: 19 MiB, 2 iterations), 12 to 128 characters.
- **Mandatory TOTP 2FA** for `owner` and `admin` (authenticator app + 10 single-use backup codes). Without 2FA, the session can only reach the screen to set it up.
- **Database-backed session** (no cookie cache): expires after 12 h of inactivity, absolute maximum of 7 days, `HttpOnly` + `Secure` + `SameSite=Strict` cookie. Critical actions require a login within the last 10 min.
- **Lockout after failed attempts:** 5 wrong passwords on the same account lock it for 15 min (doubling every 5, up to 24 h); 20 failures from the same IP in 15 min block the IP. On top of that, Better Auth's rate limit (5 logins/min per IP), stored in the database.
- **No enumeration:** login, password recovery and invitation respond the same whether or not the e-mail exists.
- **CSRF:** Better Auth checks the origin; in addition, the route rejects any cross-origin request (including the first login, without a cookie).
- **Permissions:** `owner`, `admin` and `viewer` roles in `features/auth/server/permissions.server.ts` (matrix in `docs/archive/admin-plan.md` §5.2). Every protected loader calls `requireAdmin(...)`. Panel operations go through `defineAdminOperation` (session, 2FA, permission and fresh session checked on the server).

- **Audit log:** `audit_logs` records who did what, when, from where (IP, browser, `request_id`) and the field-by-field "before → after", with secrets masked. It is written in the **same transaction** as the change. The table is immutable (trigger + an app role without UPDATE/DELETE; deletion only after 5 years). Every operation declares `audit: "required" | "none"`; an audited operation that finishes without recording an entry fails. Panel logins, lockouts, 2FA and password changes are also recorded.
- **Shell:** collapsible sidebar (remembered in a cookie), breadcrumbs, search/command palette (`Ctrl/⌘ K`), loading, error and 404 states in pt-BR. The menu shows only what the role can open.
- **Security tests:** one test imports every panel operation and checks that none runs without a session; another checks that every protected page loader calls `requireAdmin`.

**Create the first owner:**

```bash
# Dev
pnpm admin:create-owner dono@exemplo.com
# Production (app container in Coolify → Terminal, or via SSH)
docker exec -it <app-container> node create-owner.mjs dono@exemplo.com
```

The command prints a single-use link, valid for 30 minutes. If the only owner loses their 2FA and backup codes, run it again with `--force` to generate another owner invitation.
