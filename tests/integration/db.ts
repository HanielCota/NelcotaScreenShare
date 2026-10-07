import { Client } from "pg";

/** Databases derived from TEST_DATABASE_URL: the migrated template and each worker's copy. */
export function testDatabases(baseUrl: string, workerId = "0") {
  const base = new URL(baseUrl);
  const name = base.pathname.slice(1);
  const withDb = (db: string) => {
    const url = new URL(base);
    url.pathname = `/${db}`;
    return url.toString();
  };
  const template = `${name}_template`;
  const worker = `${name}_w${workerId}`;
  return {
    adminUrl: base.toString(),
    template,
    templateUrl: withDb(template),
    worker,
    workerUrl: withDb(worker),
  };
}

const IDENTIFIER = /^[a-z0-9_]+$/;

/** Runs database commands (CREATE/DROP DATABASE) over the admin connection. */
export async function adminQuery(adminUrl: string, statements: string[]) {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    for (const statement of statements) await client.query(statement);
  } finally {
    await client.end();
  }
}

/** Database name from the test config: only letters, digits and "_". */
export function ident(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`Invalid database name: ${name}`);
  return `"${name}"`;
}
