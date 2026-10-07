import { displayNameSchema } from "@/features/room/domain/participant-label";

/** E-mail that looks valid (the server does the real check). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SignUpCheck =
  | { ok: true; name: string; email: string }
  | { ok: false; field: "name" | "email" | "password"; message: string };

/** Checks the sign-up before submitting, in the order of the screen's fields. */
export function checkSignUp(input: {
  name: string;
  email: string;
  password: string;
  minPassword: number;
}): SignUpCheck {
  const name = displayNameSchema.safeParse(input.name);
  if (!name.success) {
    return {
      ok: false,
      field: "name",
      message: name.error.issues[0]?.message ?? "Confira seu nome.",
    };
  }
  const email = input.email.trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, field: "email", message: "Digite um e-mail válido." };
  }
  if (input.password.length < input.minPassword) {
    return {
      ok: false,
      field: "password",
      message: `A senha precisa ter ao menos ${input.minPassword} caracteres.`,
    };
  }
  return { ok: true, name: name.data, email };
}
