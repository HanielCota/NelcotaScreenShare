"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MS,
  adminLoginLimit,
  createSessionToken,
  passwordMatches,
} from "@/lib/admin-auth";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/rate-limit";
import { mascotSettings, saveSetting, SettingsUnavailableError } from "@/lib/settings";
import { adminCredentials, hasAdminSession } from "./session";

export interface ActionState {
  ok?: boolean;
  message?: string;
}

export async function login(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const credentials = adminCredentials();
  if (!credentials) return { message: "O painel admin está desligado neste servidor." };

  const ip = getClientIp(await headers(), getEnv().TRUSTED_PROXY_HOPS);
  const limit = adminLoginLimit.peek(ip);
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return { message: `Muitas tentativas erradas. Tente de novo em ${minutes} min.` };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !passwordMatches(password, credentials.password)) {
    adminLoginLimit.hit(ip);
    return { message: "Senha incorreta." };
  }

  adminLoginLimit.reset(ip);
  (await cookies()).set(ADMIN_COOKIE, createSessionToken(credentials.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: ADMIN_SESSION_MS / 1000,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin");
}

const mascotForm = z.object({
  saturationDark: z.coerce.number(),
  saturationLight: z.coerce.number(),
});

export async function saveMascot(_previous: ActionState, formData: FormData): Promise<ActionState> {
  // A página já confere a sessão, mas a action é um endpoint próprio: confere de novo.
  if (!(await hasAdminSession())) return { message: "Sua sessão expirou. Entre de novo." };

  const form = mascotForm.safeParse(Object.fromEntries(formData));
  if (!form.success) return { message: "Valores inválidos. Recarregue a página e tente de novo." };

  try {
    await saveSetting(mascotSettings, form.data);
  } catch (error) {
    if (error instanceof z.ZodError)
      return { message: "A saturação precisa ficar entre 0% e 200%." };
    if (error instanceof SettingsUnavailableError) {
      return { message: "Banco de dados não configurado: defina DATABASE_URL no servidor." };
    }
    console.error("[admin] falha ao salvar o mascote", error);
    return { message: "Não foi possível salvar agora. Tente de novo em instantes." };
  }
  // Páginas já abertas no navegador (cache do roteador) pegam o valor novo.
  revalidatePath("/", "layout");
  return { ok: true, message: "Salvo. Novas páginas já abrem com a saturação nova." };
}
