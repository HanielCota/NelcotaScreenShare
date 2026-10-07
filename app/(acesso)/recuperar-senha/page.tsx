import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/ui/PasswordForms";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm scope="user" />;
}
