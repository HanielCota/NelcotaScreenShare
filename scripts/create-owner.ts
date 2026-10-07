/**
 * Creates the invitation for the panel's first owner (there is no default password).
 * Prints a single-use link, valid for 30 minutes.
 *
 *   Dev:        pnpm admin:create-owner owner@example.com
 *   Production: docker exec -it <app-container> node create-owner.mjs owner@example.com
 *
 * Refuses if an active owner already exists (use --force only to recover access,
 * for example when the only owner lost their 2FA and backup codes).
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createAdminInvitation,
  OWNER_BOOTSTRAP_TTL_MS,
} from "@/features/auth/server/admin-invitations.server";
import { getDb } from "@/server/db/index.server";
import { adminUsers } from "@/server/db/schema";

const args = process.argv.slice(2);
const force = args.includes("--force");
const email = z.email().safeParse(args.find((arg) => !arg.startsWith("--")));

if (!email.success) {
  console.error("Uso: create-owner <email> [--force]");
  process.exit(1);
}

function openDb() {
  try {
    return getDb();
  } catch {
    console.error("Defina DATABASE_URL (o painel admin precisa do banco).");
    process.exit(1);
  }
}
const db = openDb();

const owners = await db
  .select({ id: adminUsers.id })
  .from(adminUsers)
  .where(and(eq(adminUsers.role, "owner"), eq(adminUsers.banned, false)));

if (owners.length > 0 && !force) {
  console.error(
    "Já existe um dono ativo. Convide novos admins pelo painel. Para recuperar acesso, rode de novo com --force.",
  );
  process.exit(1);
}

const { url, invitation } = await createAdminInvitation(db, {
  email: email.data,
  role: "owner",
  invitedBy: null,
  ttlMs: OWNER_BOOTSTRAP_TTL_MS,
});

console.info(
  `\nConvite de dono para ${invitation.email} (válido por 30 minutos, uso único):\n\n  ${url}\n`,
);
console.info("Abra o link, defina nome e senha e configure a verificação em duas etapas.\n");
process.exit(0);
