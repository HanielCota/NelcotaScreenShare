import { TwoFactorCodeForm } from "@/components/auth/TwoFactorCodeForm";

export default function AdminVerifyTwoFactorPage() {
  return <TwoFactorCodeForm scope="admin" doneHref="/admin" backHref="/admin/entrar" />;
}
