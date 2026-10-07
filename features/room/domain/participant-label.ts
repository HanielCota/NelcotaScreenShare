import { z } from "zod";

/** Name the person uses in rooms (the account's). */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Digite seu nome para entrar na sala.")
  .max(32, "Seu nome pode ter até 32 caracteres. Use um nome mais curto.");

/** Name shown in the room: the account's, the identity if missing, or "Alguém" with no participant. */
export function participantName(
  participant: { name?: string | undefined; identity: string } | undefined,
): string {
  return participant?.name || participant?.identity || "Alguém";
}
