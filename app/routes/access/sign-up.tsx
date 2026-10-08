import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { redirect } from "@/server/http.server";
import { SignUpForm } from "@/features/auth/ui/SignUpForm";
import { accessContext } from "@/features/auth/domain/access-context";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getUserSession } from "@/features/auth/server/participant-session.server";
import { getEnv } from "@/server/env.server";

export const meta = () => [{ title: "Criar conta · Nelcota" }];

export const loader = routeLoader(async ({ searchParams }) => {
  const { voltar } = searchParams;
  const returnTo = safeReturnPath(voltar);
  if (await getUserSession()) redirect(returnTo);

  const verificationRequired = getEnv().REQUIRE_EMAIL_VERIFICATION;
  return { returnTo, verificationRequired };
});

export default function SignUpPage() {
  const { returnTo, verificationRequired } = useLoaderData<typeof loader>();
  return (
    <SignUpForm
      returnTo={returnTo}
      context={accessContext(returnTo)}
      verificationRequired={verificationRequired}
    />
  );
}
