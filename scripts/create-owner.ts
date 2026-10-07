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
  console.error("Usage: create-owner <email> [--force]");
  process.exit(1);
}

function openDb() {
  try {
    return getDb();
  } catch {
    console.error("Set DATABASE_URL (the admin panel needs the database).");
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
    "An active owner already exists. Invite new admins from the panel. To recover access, run again with --force.",
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
  `\nOwner invitation for ${invitation.email} (valid for 30 minutes, single use):\n\n  ${url}\n`,
);
console.info("Open the link, set a name and password, and set up two-factor verification.\n");
process.exit(0);
