import { useLoaderData } from "react-router";

import { ResetPasswordForm } from "@/features/auth/ui/PasswordForms";
import { resetPasswordLoader } from "@/features/auth/server/reset-password-loader.server";

export const meta = () => [{ title: "Nova senha · Nelcota" }];

export const loader = resetPasswordLoader;

export default function ResetPasswordPage() {
  const { token } = useLoaderData<typeof loader>();
  return <ResetPasswordForm scope="user" token={token} />;
}
