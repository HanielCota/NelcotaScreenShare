import { useLoaderData } from "react-router";

import { ResetPasswordForm } from "@/features/auth/ui/PasswordForms";
import { resetPasswordLoader } from "@/features/auth/server/reset-password-loader.server";

export const loader = resetPasswordLoader;

export default function AdminResetPasswordPage() {
  const { token } = useLoaderData<typeof loader>();
  return <ResetPasswordForm scope="admin" token={token} />;
}
