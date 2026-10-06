"use client";

import { LogOut, SunMoon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { applyTheme, currentTheme } from "@/lib/theme";
import type { NavGroup } from "@/server/admin-nav";
import { NAV_ICONS } from "./nav-icons";

/**
 * Command palette (Ctrl/⌘ K): navegação do painel e ações rápidas. A busca de
 * salas e usuários por código/nome entra com os CRUDs (Fase 5).
 */
export function CommandPalette({
  groups,
  open,
  onOpenChange,
  onSignOut,
}: {
  groups: NavGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar no painel"
      description="Digite para ir a uma tela ou executar uma ação."
    >
      {/* Nesta versão do shadcn, o conteúdo precisa vir dentro de <Command> (contexto do cmdk). */}
      <Command>
        <CommandInput placeholder="Ir para… ou executar…" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords.join(" ")}`}
                    onSelect={() => run(() => router.push(item.href))}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Ações">
            <CommandItem
              value="alternar tema claro escuro"
              onSelect={() => run(() => applyTheme(currentTheme() === "light" ? "dark" : "light"))}
            >
              <SunMoon aria-hidden="true" />
              Alternar tema claro/escuro
            </CommandItem>
            <CommandItem value="sair logout" onSelect={() => run(onSignOut)}>
              <LogOut aria-hidden="true" />
              Sair do painel
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
