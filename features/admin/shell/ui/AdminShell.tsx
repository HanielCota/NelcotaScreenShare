import { Search } from "lucide-react";
import { Link, useLocation, useNavigate, useRevalidator } from "react-router";
import { Fragment, useState, type ReactNode } from "react";
import { NavBar, NavDivider } from "@/components/shell/NavBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { adminAuthClient } from "@/features/auth/client/admin-auth-client";
import { callAuth } from "@/features/auth/client/auth-call";
import type { NavGroup } from "@/features/admin/shell/server/nav.server";
import { AdminSidebar, type ShellUser } from "./AdminSidebar";
import { CommandPalette } from "./CommandPalette";

/** Labels for URL segments that are not in the navigation (e.g. "conta"). */
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Início",
  conta: "Minha conta",
  "sem-permissao": "Sem permissão",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useBreadcrumbs(groups: NavGroup[]) {
  const pathname = useLocation().pathname;
  const labels = new Map(
    groups.flatMap((group) => group.items.map((item) => [item.href, item.label])),
  );
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, index) => {
    const href = `/${parts.slice(0, index + 1).join("/")}`;
    return {
      href,
      // IDs in the URL (detail pages) become "Detalhes": the page title says which one.
      label: labels.get(href) ?? SEGMENT_LABELS[part] ?? (UUID.test(part) ? "Detalhes" : part),
      current: index === parts.length - 1,
    };
  });
}

function AdminBreadcrumbs({ groups }: { groups: NavGroup[] }) {
  const crumbs = useBreadcrumbs(groups);
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 ? <BreadcrumbSeparator className="max-sm:hidden" /> : null}
            <BreadcrumbItem className={cn("max-w-48 truncate", !crumb.current && "max-sm:hidden")}>
              {crumb.current ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link viewTransition to={crumb.href}>
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function AdminTopBar({ groups, onOpenPalette }: { groups: NavGroup[]; onOpenPalette: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-canvas/85 px-4 pt-4 pb-2 backdrop-blur-xl sm:px-6">
      <NavBar aria-label="Painel administrativo" className="mx-auto max-w-6xl">
        <SidebarTrigger aria-label="Mostrar ou esconder o menu" />
        <NavDivider />
        <AdminBreadcrumbs groups={groups} />
        <span className="ml-auto flex items-center gap-1">
          <Button variant="secondary" onClick={onOpenPalette}>
            <Search data-icon="inline-start" aria-hidden="true" />
            <span className="max-sm:sr-only">Buscar</span>
            <kbd className="rounded-md border border-line px-1.5 text-xs font-medium max-sm:hidden">
              Ctrl K
            </kbd>
          </Button>
          <ThemeToggle />
        </span>
      </NavBar>
    </header>
  );
}

function useAdminSignOut() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  return async function signOut() {
    await callAuth(() => adminAuthClient.signOut());
    void navigate("/admin/entrar?aviso=saiu", { replace: true, viewTransition: true });
    void revalidator.revalidate();
  };
}

export function AdminShell({
  user,
  groups,
  defaultOpen,
  children,
}: {
  user: ShellUser;
  groups: NavGroup[];
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const signOut = useAdminSignOut();
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="admin-shell">
      <AdminSidebar user={user} groups={groups} onSignOut={() => void signOut()} />

      <SidebarInset className="min-w-0">
        <AdminTopBar groups={groups} onOpenPalette={() => setPaletteOpen(true)} />
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-8 sm:px-6">
          {children}
        </div>
      </SidebarInset>
      <CommandPalette
        groups={groups}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSignOut={() => void signOut()}
      />
    </SidebarProvider>
  );
}
