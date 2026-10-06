import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Os outros testes rodam como superusuário. Aqui as operações rodam com o papel
 * do app (nelcota_app), com os mesmos grants do deploy/postgres/bootstrap.sql:
 * uma migração que esqueça o GRANT ou o REVOKE aparece aqui, e não em produção.
 */
const client = new Client({ connectionString: process.env.DATABASE_URL });

beforeAll(async () => {
  await client.connect();
  // Papel do cluster: cria se faltar (CI); no Postgres de dev ele já existe.
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelcota_app') THEN
      CREATE ROLE nelcota_app NOLOGIN;
    END IF;
  END $$`);
  // Mesmo trecho do bootstrap.sql (grants gerais + REVOKE das tabelas só de inserção).
  await client.query(`
    GRANT USAGE ON SCHEMA public TO nelcota_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nelcota_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nelcota_app;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM nelcota_app;
    REVOKE UPDATE, TRUNCATE ON token_requests FROM nelcota_app;
    REVOKE UPDATE, TRUNCATE ON livekit_events FROM nelcota_app;
    GRANT UPDATE (processed_at, error) ON livekit_events TO nelcota_app;
  `);
  await client.query("SET ROLE nelcota_app");
});

afterAll(async () => {
  await client.query("RESET ROLE");
  await client.end();
});

async function fails(statement: string, values: unknown[] = []): Promise<string> {
  await client.query("SAVEPOINT tentativa");
  try {
    await client.query(statement, values);
    return "passou";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT tentativa");
  }
}

describe("papel do app no Postgres", () => {
  it("lê e escreve dados comuns", async () => {
    await client.query("BEGIN");
    try {
      const room = await client.query<{ id: string }>(
        "insert into rooms (code) values ('papel-app') returning id",
      );
      expect(room.rows).toHaveLength(1);
      await client.query("update rooms set note = 'ok' where code = 'papel-app'");
      await client.query(
        "insert into token_requests (room_code, result) values ('papel-app', 'granted')",
      );
      await client.query(
        "insert into livekit_events (id, event, payload, occurred_at) values ('EV_papel', 'room_started', '{}', now())",
      );
      await client.query("update livekit_events set processed_at = now() where id = 'EV_papel'");
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("não altera auditoria, pedidos de token nem o corpo dos eventos, e não faz DDL", async () => {
    await client.query("BEGIN");
    try {
      expect(await fails("update audit_logs set action = action")).toMatch(/permission denied/);
      expect(await fails("delete from audit_logs")).toMatch(/permission denied/);
      expect(await fails("update token_requests set result = result")).toMatch(/permission denied/);
      expect(await fails("update livekit_events set payload = '{}'")).toMatch(/permission denied/);
      expect(await fails("create table invasora (id int)")).toMatch(/permission denied/);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
