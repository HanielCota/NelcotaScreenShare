"use client";

import { ChevronsUpDown, LogOut, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Fragment, useState, type ReactNode } from "react";
import { NavBrand } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { adminAuthClient } from "@/lib/admin-auth-client";
import type { NavGroup } from "@/server/admin-nav";
import { CommandPalette } from "./CommandPalette";
import { NAV_ICONS } from "./nav-icons";

interface ShellUser {
  name: string;
  email: string;
  roleLabel: string;
}

/** Rótulos dos trechos de URL que não estão na navegação (ex.: "conta"). */
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Início",
  conta: "Minha conta",
  "sem-permissao": "Sem permissão",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useBreadcrumbs(groups: NavGroup[]) {
  const pathname = usePathname();
  const labels = new Map(
    groups.flatMap((group) => group.items.map((item) => [item.href, item.label])),
  );
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, index) => {
    const href = `/${parts.slice(0, index + 1).join("/")}`;
    return {
      href,
      // IDs na URL (páginas de detalhe) viram "Detalhes": o título da página diz qual é.
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
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = useBreadcrumbs(groups);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function signOut() {
    void adminAuthClient.signOut().finally(() => {
      router.replace("/admin/entrar?aviso=saiu");
      router.refresh();
    });
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-10 items-center px-1 group-data-[collapsible=icon]:justify-center">
            <NavBrand href="/admin" showName={false} />
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Painel Nelcota
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
                          <Link href={item.href}>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={user.name}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-sm font-bold">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col text-left leading-tight">
                      <span className="truncate text-sm font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-ink-subtle">{user.roleLabel}</span>
                    </span>
                    <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
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
                  <DropdownMenuItem asChild>
                    <Link href="/admin/conta/seguranca">
                      <UserRound aria-hidden="true" />
                      Minha conta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={signOut}>
                    <LogOut aria-hidden="true" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/85 px-3 backdrop-blur-xl sm:px-4">
          <SidebarTrigger aria-label="Mostrar ou esconder o menu" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={crumb.href}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem className="max-w-48 truncate">
                    {crumb.current ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <span className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              className="h-9 gap-2 rounded-xl px-3 text-ink-muted"
              onClick={() => setPaletteOpen(true)}
            >
              <Search aria-hidden="true" />
              <span className="max-sm:sr-only">Buscar</span>
              <kbd className="rounded-md border border-line px-1.5 text-[0.7rem] font-semibold max-sm:hidden">
                Ctrl K
              </kbd>
            </Button>
            <ThemeToggle />
          </span>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
          <NuqsAdapter>{children}</NuqsAdapter>
        </main>
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
