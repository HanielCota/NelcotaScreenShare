import { ArrowUpRight, ChevronsUpDown, LogOut, Search, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate, useRevalidator } from "react-router";
import { Fragment, useState, type ReactNode } from "react";
import { NavBar, NavBrand, NavDivider } from "@/components/shell/NavBar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { adminAuthClient } from "@/features/auth/client/admin-auth-client";
import type { NavGroup } from "@/features/admin/shell/server/nav.server";
import { CommandPalette } from "./CommandPalette";
import { NAV_ICONS } from "./nav-icons";

interface ShellUser {
  name: string;
  email: string;
  roleLabel: string;
}

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

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
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
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const crumbs = useBreadcrumbs(groups);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function signOut() {
    void adminAuthClient.signOut().finally(() => {
      void navigate("/admin/entrar?aviso=saiu", { replace: true, viewTransition: true });
      void revalidator.revalidate();
    });
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="admin-shell">
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="gap-0 pt-4 pb-3 group-data-[collapsible=icon]:pt-2">
          <div className="flex h-10 items-center group-data-[collapsible=icon]:justify-center">
            <NavBrand href="/admin" showName={false} />
            <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">Nelcota</span>
              <span className="text-xs text-ink-subtle">Painel admin</span>
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = NAV_ICONS[item.icon];
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(pathname, item.href)}
                          tooltip={item.label}
                        >
                          <Link
                            viewTransition
                            to={item.href}
                            aria-current={isActive(pathname, item.href) ? "page" : undefined}
                          >
                            <Icon aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Voltar ao app">
                <Link viewTransition to="/">
                  <ArrowUpRight aria-hidden="true" />
                  <span>Voltar ao app</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator className="mx-0" />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={user.name}>
                    <UserAvatar image={null} className="size-8" />
                    <span className="flex min-w-0 flex-col text-left leading-tight">
                      <span className="truncate text-sm font-medium">{user.name}</span>
                      <span className="truncate text-xs text-ink-subtle">{user.roleLabel}</span>
                    </span>
                    <ChevronsUpDown className="ml-auto" aria-hidden="true" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-60">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate">{user.name}</span>
                    <span className="truncate text-xs font-normal text-ink-subtle">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link viewTransition to="/admin/conta/seguranca">
                        <UserRound aria-hidden="true" />
                        Minha conta
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={signOut}>
                      <LogOut aria-hidden="true" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 bg-canvas/85 px-4 pt-4 pb-2 backdrop-blur-xl sm:px-6">
          <NavBar aria-label="Painel administrativo" className="mx-auto max-w-6xl">
            <SidebarTrigger aria-label="Mostrar ou esconder o menu" />
            <NavDivider />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                {crumbs.map((crumb, index) => (
                  <Fragment key={crumb.href}>
                    {index > 0 ? <BreadcrumbSeparator className="max-sm:hidden" /> : null}
                    <BreadcrumbItem
                      className={cn("max-w-48 truncate", !crumb.current && "max-sm:hidden")}
                    >
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
            <span className="ml-auto flex items-center gap-1">
              <Button variant="secondary" onClick={() => setPaletteOpen(true)}>
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
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-8 sm:px-6">
          {children}
        </div>
      </SidebarInset>
      <CommandPalette
        groups={groups}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSignOut={signOut}
      />
    </SidebarProvider>
  );
}
