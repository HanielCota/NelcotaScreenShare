import { ForgotPasswordForm } from "@/features/auth/ui/PasswordForms";

export const meta = () => [{ title: "Recuperar senha · Nelcota" }];

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm scope="user" />;
}
