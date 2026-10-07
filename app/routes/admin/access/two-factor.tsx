import { TwoFactorCodeForm } from "@/features/auth/ui/TwoFactorCodeForm";

export default function AdminVerifyTwoFactorPage() {
  return <TwoFactorCodeForm scope="admin" doneHref="/admin" backHref="/admin/entrar" />;
}
