import { AppHeader, type AppHeaderProps } from "@/components/shell/AppHeader";
import { useRouteLoaderData } from "react-router";
import type { loader } from "@/app/root";

/** App header with the signed-in account read from the root loader data. */
export function ParticipantHeader(props: Omit<AppHeaderProps, "account">) {
  const current = useRouteLoaderData<typeof loader>("root");
  return <AppHeader {...props} account={current?.account ?? null} />;
}
