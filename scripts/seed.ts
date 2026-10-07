/**
 * Development and load-test data (docs/archive/admin-plan.md §4.6). Idempotent:
 * running it again duplicates nothing.
 *
 *   pnpm db:seed                      → "dev" profile
 *   pnpm db:seed --perfil=carga --linhas=300000
 *
 * Refuses production and databases outside the local machine (use --forcar for a
 * disposable remote test database).
 */
import { fakerPT_BR as faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/features/auth/server/password.server";
import { getDb } from "@/server/db/index.server";
import { auditLogs, userAccounts, users } from "@/server/db/schema";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value] as const;
  }),
);
const profile = args.get("perfil") ?? "dev";
const rows = Number(args.get("linhas") ?? 300_000);
/** Password of every seeded participant (dev only). */
const SEED_PASSWORD = "dev-password-1234";

const url = process.env.DATABASE_URL ?? "";
const local = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);
if (process.env.NODE_ENV === "production" || (!local && !args.has("forcar"))) {
  console.error(
    "Seed refused: it only runs on a local database (or with --forcar on a disposable one).",
  );
  process.exit(1);
}
function openDb() {
  try {
    return getDb();
  } catch {
    console.error("Set DATABASE_URL.");
    process.exit(1);
  }
}
const db = openDb();

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
  const inserted = await db
    .insert(users)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (inserted.length > 0) {
    await db.insert(userAccounts).values(
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
  const [existing] = await db
    .execute<{ total: number }>(
      sql`select count(*)::int as total from audit_logs where metadata->>'seed' = 'true'`,
    )
    .then((result) => result.rows);
  const missing = target - (existing?.total ?? 0);
  if (missing <= 0) return 0;
  faker.seed(7);
  const admins = await db.execute<{ id: string }>(sql`select id from admin_users limit 20`);
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
    await db.insert(auditLogs).values(batch.slice(i, i + 1000));
  }
  return missing;
}

/** Load: generated inside Postgres (generate_series), seconds for 300k rows. */
async function seedLoad(total: number) {
  const before = await db.execute<{ total: number }>(
    sql`select count(*)::int as total from audit_logs where metadata->>'seed' = 'carga'`,
  );
  const missing = total - (before.rows[0]?.total ?? 0);
  if (missing > 0) {
    await db.execute(sql`
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
  await db.execute(sql`
    insert into users (name, email, email_verified, created_at, last_seen_at)
    select 'Carga ' || g, 'carga' || g || '@exemplo.dev', true,
           now() - (g % 700) * interval '1 day', now() - (g % 90) * interval '1 hour'
    from generate_series(1, ${people}) as g
    on conflict do nothing
  `);
  await db.execute(sql`analyze audit_logs; analyze users;`);
  return { audit: Math.max(missing, 0), participants: people };
}

/**
 * Rooms, participations, shares and token requests, generated in
 * Postgres. Deterministic (hashtext) and idempotent (fixed codes and sids).
 * The first 3 rooms stay active, with people inside.
 */
async function seedRooms(count: number, prefix: string, userPattern: string) {
  const before = await db.execute<{ total: number }>(
    sql`select count(*)::int as total from rooms where code like ${`${prefix}%`}`,
  );
  await db.execute(sql`
    insert into rooms (code, status, started_at, finished_at, last_activity_at, created_by_user_id)
    select code, case when g <= 3 then 'active' else 'finished' end::room_status,
           started, case when g <= 3 then null else started + length end,
           case when g <= 3 then now() else started + length end,
           pool.ids[1 + abs(hashtext(code)) % pool.total]
    from generate_series(1, ${count}) as g
    cross join (select array_agg(id order by id) as ids, count(*)::int as total
                from users where email like ${userPattern}) as pool
    cross join lateral (select ${prefix} || lpad(g::text, 6, '0') as code) as c
    cross join lateral (select
      case when g <= 3 then now() - interval '25 minutes'
           else now() - (abs(hashtext(c.code || 'd')) % 86400) * interval '1 minute' - interval '3 hours' end as started,
      (20 + abs(hashtext(c.code || 'l')) % 100) * interval '1 minute' as length) as t
    where pool.total > 0
    on conflict do nothing
  `);
  await db.execute(sql`
    insert into room_participations
      (room_id, user_id, livekit_identity, livekit_sid, display_name, ip, joined_at, left_at, leave_reason)
    select r.id, u.id, u.id::text, 'PA_' || r.code || '_' || n, u.name,
           ('10.1.' || n || '.' || abs(hashtext(r.code)) % 250)::inet,
           r.started_at + n * interval '2 minutes',
           case when r.status = 'finished' then r.finished_at - n * interval '1 minute' end,
           case when r.status = 'finished'
                then (array['left','left','disconnected','room_closed'])[1 + (abs(hashtext(r.code)) + n) % 4]
           end::participant_leave_reason
    from rooms r
    cross join (select array_agg(id order by id) as ids, count(*)::int as total
                from users where email like ${userPattern}) as pool
    cross join lateral generate_series(1, 2 + abs(hashtext(r.code)) % 4) as n
    join users u on u.id = pool.ids[1 + (abs(hashtext(r.code)) + n * 37) % pool.total]
    where r.code like ${`${prefix}%`}
    on conflict (livekit_sid) do nothing
  `);
  await db.execute(sql`
    insert into share_sessions (room_id, participation_id, track_sid, with_audio, started_at, ended_at)
    select p.room_id, p.id, 'TR_' || p.livekit_sid, abs(hashtext(p.livekit_sid)) % 3 = 0,
           p.joined_at + interval '1 minute',
           case when p.left_at is not null then least(p.left_at,
             p.joined_at + interval '1 minute' + (1 + abs(hashtext(p.livekit_sid)) % 15) * interval '1 minute') end
    from room_participations p
    where p.livekit_sid like ${`PA_${prefix}%`} and abs(hashtext(p.livekit_sid)) % 2 = 0
    on conflict (track_sid) do nothing
  `);
  await db.execute(sql`
    update rooms r set peak_participants = (select count(*) from room_participations p where p.room_id = r.id)
    where r.code like ${`${prefix}%`} and r.peak_participants = 0
  `);
  // One granted request per join plus some refusals; only the first time.
  await db.execute(sql`
    insert into token_requests (room_code, room_id, user_id, result, ip, created_at)
    select r.code, r.id, p.user_id,
           case when abs(hashtext(p.livekit_sid)) % 10 = 0 then 'wrong_password'
                when abs(hashtext(p.livekit_sid)) % 25 = 1 then 'room_full'
                else 'granted' end::token_result,
           p.ip, p.joined_at - interval '20 seconds'
    from room_participations p join rooms r on r.id = p.room_id
    where r.code like ${`${prefix}%`}
      and not exists (select 1 from token_requests t where t.room_code like ${`${prefix}%`})
  `);
  const after = await db.execute<{ total: number }>(
    sql`select count(*)::int as total from rooms where code like ${`${prefix}%`}`,
  );
  return (after.rows[0]?.total ?? 0) - (before.rows[0]?.total ?? 0);
}

async function seedLoadProfile(started: number) {
  const result = await seedLoad(rows);
  const loadRooms = await seedRooms(Math.ceil(rows / 15), "carga-", "carga%@exemplo.dev");
  await db.execute(sql`analyze rooms; analyze room_participations; analyze share_sessions;`);
  console.info(`[seed] load: +${loadRooms} rooms with participations and shares`);
  console.info(
    `[seed] load: +${result.audit} audit, up to ${result.participants} participants (${Date.now() - started} ms)`,
  );
}

async function seedDevProfile(started: number) {
  const participants = await seedParticipants(300);
  const audit = await seedAudit(2_000);
  const devRooms = await seedRooms(60, "seed-", "participante%@exemplo.dev");
  console.info(`[seed] dev: +${devRooms} rooms with participations and shares`);
  console.info(
    `[seed] dev: +${participants} participants (password "${SEED_PASSWORD}"), +${audit} audit records (${Date.now() - started} ms)`,
  );
}

async function seedProfile(started: number) {
  if (profile === "carga") {
    await seedLoadProfile(started);
    return;
  }
  await seedDevProfile(started);
}

const started = Date.now();
await seedProfile(started);
process.exit(0);
