import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/server/db/schema";
import { users } from "@/server/db/schema";
import { CookieJar, makeCaller } from "./http-auth";

type Handler = (request: Request) => Promise<Response>;

let counter = 0;

/**
 * Creates a participant with an already verified email and returns the session (cookies).
 * Sign-up goes through the real handler; email verification is done directly
 * in the database (the link flow is tested separately).
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
  if (signUp.status !== 200) throw new Error(`sign-up failed: ${signUp.status}`);
  const [user] = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.email, email))
    .returning({ id: users.id });
  if (!user) throw new Error("participant not created");
  const jar = new CookieJar();
  const signIn = await call("/sign-in/email", { body: { email, password }, jar });
  if (signIn.status !== 200) throw new Error(`sign-in failed: ${signIn.status}`);
  return { id: user.id, email, name, password, jar };
}
