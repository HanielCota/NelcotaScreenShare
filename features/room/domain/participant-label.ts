import { z } from "zod";

/** Nome que a pessoa usa nas salas (o da conta). */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Digite seu nome para entrar na sala.")
  .max(32, "Seu nome pode ter até 32 caracteres. Use um nome mais curto.");

/** Nome mostrado na sala: o da conta, a identidade se faltar, ou "Alguém" sem participante. */
export function participantName(
  participant: { name?: string | undefined; identity: string } | undefined,
): string {
  return participant?.name || participant?.identity || "Alguém";
}
