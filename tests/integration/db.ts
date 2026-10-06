import { Client } from "pg";

/** Bancos derivados de TEST_DATABASE_URL: o modelo migrado e a cópia de cada worker. */
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

/** Executa comandos de banco (CREATE/DROP DATABASE) pela conexão administrativa. */
export async function adminQuery(adminUrl: string, statements: string[]) {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    for (const statement of statements) await client.query(statement);
  } finally {
    await client.end();
  }
}

/** Nome de banco vindo da configuração de teste: só letras, números e "_". */
export function ident(name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`Nome de banco inválido: ${name}`);
  return `"${name}"`;
}
