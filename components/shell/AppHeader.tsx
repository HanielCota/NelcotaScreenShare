import { Keyboard } from "lucide-react";
import { Link } from "react-router";
import type { ReactNode } from "react";
import { HowItWorks } from "@/components/shell/HowItWorks";
import {
  NavBar,
  NavBrand,
  NavDivider,
  NavPopover,
  ShortcutsPanel,
} from "@/components/shell/NavBar";
import { navItemClass } from "@/components/shell/nav-item-class";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppHeaderProps {
  account: { name: string; image: string | null } | null;
  accountHref?: string;
  accountCurrent?: boolean;
  showAuthLinks?: boolean;
  actions?: ReactNode;
  className?: string;
  "data-anim"?: string;
}

/** Shared navigation for the app pages, before and after the call. */
export function AppHeader({
  account,
  accountHref = "/conta",
  accountCurrent = false,
  showAuthLinks = true,
  actions,
  className,
  "data-anim": animation,
}: AppHeaderProps) {
  return (
    <header data-anim={animation} className={cn("apple-buttons px-4 pt-4 sm:px-6", className)}>
      <NavBar aria-label="Principal" className="mx-auto max-w-5xl">
        <NavBrand href="/" />
        <NavDivider className="max-md:hidden" />
        <HowItWorks className="max-md:hidden" />
        <NavPopover
          trigger={
            <>
              <Keyboard className="size-4" aria-hidden="true" />
              Atalhos
            </>
          }
          label="Atalhos"
          className="max-md:hidden"
        >
          <ShortcutsPanel />
        </NavPopover>
        <Link viewTransition to="/privacidade" className={cn(navItemClass, "max-lg:hidden")}>
          Privacidade
        </Link>
        <ThemeToggle className="ml-auto" />
        {account ? (
          <>
            <NavDivider />
            <Link
              viewTransition
              to={accountHref}
              aria-label="Minha conta"
              aria-current={accountCurrent ? "page" : undefined}
              className={cn(navItemClass, "max-w-44 pl-0.5 max-sm:pr-0.5")}
            >
              <UserAvatar image={account.image} className="size-8" />
              <span className="truncate max-sm:hidden">{account.name}</span>
            </Link>
          </>
        ) : showAuthLinks ? (
          <>
            <NavDivider />
            <Link viewTransition to="/entrar" className={navItemClass}>
              Entrar
            </Link>
            <Button asChild className="max-sm:hidden">
              <Link viewTransition to="/cadastro">
                Criar conta
              </Link>
            </Button>
          </>
        ) : null}
        {actions ? (
          <>
            <NavDivider />
            {actions}
          </>
        ) : null}
      </NavBar>
    </header>
  );
}
