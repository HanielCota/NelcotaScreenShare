import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData, Link } from "react-router";

import { requireAdmin } from "@/features/auth/server/admin-session.server";
import { getDashboardSummary } from "@/features/admin/dashboard/server/summary.server";
import { getDb } from "@/server/db/index.server";

export const meta = () => [{ title: "Início · Nelcota" }];

export const loader = routeLoader(async () => {
  await requireAdmin({ dashboard: ["read"] });
  return { summary: await getDashboardSummary(getDb()) };
});

function Stat({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <li>
      <Link
        viewTransition
        to={href}
        className="panel flex h-full flex-col gap-1 rounded-2xl p-5 transition-colors hover:bg-surface-2"
      >
        <span className="text-3xl font-medium tracking-tight tabular-nums">{value}</span>
        <span className="text-sm text-ink-muted">{label}</span>
      </Link>
    </li>
  );
}

export default function AdminHomePage() {
  const { summary } = useLoaderData<typeof loader>();
  return (
    <>
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Início</h1>
        <p className="mt-1 text-ink-muted">
          O que está acontecendo agora e o que mudou nos últimos dias.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          href="/admin/salas?status=ativa"
          value={summary.activeRooms}
          label="Salas abertas agora"
        />
        <Stat
          href="/admin/salas?status=ativa"
          value={summary.peopleOnline}
          label="Pessoas em sala agora"
        />
        <Stat
          href="/admin/compartilhamentos"
          value={summary.sharesToday}
          label="Telas compartilhadas nas últimas 24 h"
        />
        <Stat
          href="/admin/usuarios"
          value={summary.newParticipants}
          label="Contas novas nos últimos 7 dias"
        />
      </ul>
    </>
  );
}

export { AdminErrorBoundary as ErrorBoundary } from "@/features/admin/shell/ui/AdminErrorBoundary";
