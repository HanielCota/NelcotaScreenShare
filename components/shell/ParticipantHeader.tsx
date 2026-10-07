import { AppHeader, type AppHeaderProps } from "@/components/shell/AppHeader";
import { useRouteLoaderData } from "react-router";
import type { loader } from "@/app/root";

/** Resolves the account on the server, using the session already shared per render. */
export function ParticipantHeader(props: Omit<AppHeaderProps, "account">) {
  const current = useRouteLoaderData<typeof loader>("root");
  return <AppHeader {...props} account={current?.account ?? null} />;
}
