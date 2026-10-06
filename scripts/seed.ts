/**
 * Dados de desenvolvimento e de carga (docs/PLANO-ADMIN.md §4.6). Idempotente:
 * rodar de novo não duplica nada.
 *
 *   pnpm db:seed                      → perfil "dev"
 *   pnpm db:seed --perfil=carga --linhas=300000
 *
 * Recusa produção e bancos fora da máquina local (use --forcar se for um
 * banco de teste remoto descartável).
 */
import { fakerPT_BR as faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { getDb } from "@/server/db";
import { auditLogs, userAccounts, users } from "@/server/db/schema";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value] as const;
  }),
);
const profile = args.get("perfil") ?? "dev";
const rows = Number(args.get("linhas") ?? 300_000);
/** Senha de todos os participantes do seed (só em dev). */
const SEED_PASSWORD = "senha-dev-1234";

const url = process.env.DATABASE_URL ?? "";
const local = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);
if (process.env.NODE_ENV === "production" || (!local && !args.has("forcar"))) {
  console.error("Seed recusado: só roda em banco local (ou com --forcar num banco descartável).");
  process.exit(1);
}
const db = getDb();
if (!db) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}

const ACTIONS = [
  ["auth.sign_in", "admin_user"],
  ["auth.sign_in_failed", "admin_user"],
  ["settings.update", "app_settings"],
  ["admin_session.revoke", "admin_session"],
  ["auth.two_factor_enabled", "admin_user"],
  ["user.self_delete", "user"],
] as const;

async function seedParticipants(count: number) {
  faker.seed(42);
  const hash = await hashPassword(SEED_PASSWORD);
  const values = Array.from({ length: count }, (_, index) => {
    const n = String(index + 1).padStart(3, "0");
    return {
      name: faker.person.firstName().slice(0, 32),
      email: `participante${n}@exemplo.dev`,
      emailVerified: true,
      lastSeenAt: faker.date.recent({ days: 60 }),
      createdAt: faker.date.past({ years: 1 }),
    };
  });
  const inserted = await db!
    .insert(users)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (inserted.length > 0) {
    await db!.insert(userAccounts).values(
      inserted.map((user) => ({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hash,
      })),
    );
  }
  return inserted.length;
}

async function seedAudit(target: number) {
  const [existing] = await db!
    .execute<{ total: number }>(
      sql`select count(*)::int as total from audit_logs where metadata->>'seed' = 'true'`,
    )
    .then((result) => result.rows);
  const missing = target - Number(existing?.total ?? 0);
  if (missing <= 0) return 0;
  faker.seed(7);
  const admins = await db!.execute<{ id: string }>(sql`select id from admin_users limit 20`);
  const adminIds = admins.rows.map((row) => row.id);
  const batch = Array.from({ length: missing }, () => {
    const [action, resourceType] = faker.helpers.arrayElement(ACTIONS);
    const actor =
      action === "auth.sign_in_failed" || adminIds.length === 0
        ? null
        : faker.helpers.arrayElement(adminIds);
    return {
      actorAdminId: actor,
      action,
      resourceType,
      resourceId: faker.string.uuid(),
      changes:
        action === "settings.update"
          ? {
              saturationDark: {
                antes: 1,
                depois: faker.number.float({ min: 0, max: 2, fractionDigits: 2 }),
              },
            }
          : null,
      metadata: { seed: true },
      ip: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      requestId: faker.string.uuid(),
      createdAt: faker.date.recent({ days: 90 }),
    };
  });
  for (let i = 0; i < batch.length; i += 1000) {
    await db!.insert(auditLogs).values(batch.slice(i, i + 1000));
  }
  return missing;
}

/** Carga: geração no próprio Postgres (generate_series), segundos para 300 mil linhas. */
async function seedLoad(total: number) {
  const before = await db!.execute<{ total: number }>(
    sql`select count(*)::int as total from audit_logs where metadata->>'seed' = 'carga'`,
  );
  const missing = total - Number(before.rows[0]?.total ?? 0);
  if (missing > 0) {
    await db!.execute(sql`
      insert into audit_logs (action, resource_type, resource_id, metadata, ip, request_id, created_at)
      select
        (array['auth.sign_in','auth.sign_in_failed','settings.update','admin_session.revoke'])[1 + (g % 4)],
        (array['admin_user','admin_user','app_settings','admin_session'])[1 + (g % 4)],
        md5(g::text),
        '{"seed":"carga"}'::jsonb,
        ('10.' || (g % 250) || '.' || (g % 200) || '.' || (g % 100))::inet,
        md5('r' || g::text),
        now() - (g % 365) * interval '1 day' - (g % 86400) * interval '1 second'
      from generate_series(1, ${missing}) as g
    `);
  }
  const people = Math.ceil(total / 10);
  await db!.execute(sql`
    insert into users (name, email, email_verified, created_at, last_seen_at)
    select 'Carga ' || g, 'carga' || g || '@exemplo.dev', true,
           now() - (g % 700) * interval '1 day', now() - (g % 90) * interval '1 hour'
    from generate_series(1, ${people}) as g
    on conflict do nothing
  `);
  await db!.execute(sql`analyze audit_logs; analyze users;`);
  return { audit: Math.max(missing, 0), participants: people };
}

const started = Date.now();
if (profile === "carga") {
  const result = await seedLoad(rows);
  console.info(
    `[seed] carga: +${result.audit} auditoria, até ${result.participants} participantes (${Date.now() - started} ms)`,
  );
} else {
  const participants = await seedParticipants(300);
  const audit = await seedAudit(2_000);
  console.info(
    `[seed] dev: +${participants} participantes (senha "${SEED_PASSWORD}"), +${audit} registros de auditoria (${Date.now() - started} ms)`,
  );
}
process.exit(0);
