import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { ResetPasswordForm } from "@/features/auth/ui/PasswordForms";

export const meta = () => [{ title: "Nova senha · Nelcota" }];

/** O Better Auth redireciona para cá com ?token=… (ou ?error=INVALID_TOKEN). */
export const loader = routeLoader(async ({ searchParams }) => {
  const { token, error } = searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;

  return { token, valid };
});

export default function ResetPasswordPage() {
  const { token, valid } = useLoaderData<typeof loader>();
  return <ResetPasswordForm scope="user" token={valid ? token : undefined} />;
}
