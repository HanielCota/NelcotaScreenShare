import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/server/db/schema";
import { users } from "@/server/db/schema";
import { CookieJar, makeCaller } from "./http-auth";

type Handler = (request: Request) => Promise<Response>;

let counter = 0;

/**
 * Cria um participante com e-mail já confirmado e devolve a sessão (cookies).
 * O cadastro passa pelo handler real; a confirmação do e-mail é feita direto
 * no banco (o fluxo do link é testado à parte).
 */
export async function verifiedParticipant(
  db: NodePgDatabase<typeof schema>,
  handler: Handler,
  { name = "Ana Teste", password = "senha-do-participante-1" } = {},
) {
  counter += 1;
  const email = `participante${counter}-${Date.now()}@exemplo.com`;
  const call = makeCaller(handler, "/api/auth", `192.0.2.${(counter % 200) + 1}`);
  const signUp = await call("/sign-up/email", { body: { name, email, password } });
  if (signUp.status !== 200) throw new Error(`cadastro falhou: ${signUp.status}`);
  const [user] = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.email, email))
    .returning({ id: users.id });
  if (!user) throw new Error("participante não criado");
  const jar = new CookieJar();
  const signIn = await call("/sign-in/email", { body: { email, password }, jar });
  if (signIn.status !== 200) throw new Error(`login falhou: ${signIn.status}`);
  return { id: user.id, email, name, password, jar };
}
