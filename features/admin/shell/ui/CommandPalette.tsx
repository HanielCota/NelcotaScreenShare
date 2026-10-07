import { LogOut, SunMoon, User, Video } from "lucide-react";
import { useOperation } from "@/lib/use-operation";
import { useNavigate } from "react-router";

import { useEffect, useState } from "react";
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
import { searchPanelAction } from "@/features/admin/search/actions";
import { applyTheme, currentTheme } from "@/lib/theme";
import type { NavGroup } from "@/features/admin/shell/nav.server";
import { NAV_ICONS } from "./nav-icons";

/**
 * Command palette (Ctrl/⌘ K): navegação do painel, ações rápidas e busca de
 * salas (código) e participantes (nome ou e-mail, sem acento).
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
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const search = useOperation(searchPanelAction);
  const { execute } = search;
  const term = query.trim();
  const results = term.length >= 2 && search.input?.q === term ? search.result.data : undefined;

  // Busca no servidor depois de uma pausa na digitação.
  useEffect(() => {
    if (term.length < 2) return;
    const timer = setTimeout(() => execute({ q: term }), 250);
    return () => clearTimeout(timer);
  }, [term, execute]);

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
    setQuery("");
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
        <CommandInput
          placeholder="Ir para…, código da sala ou nome de alguém"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{search.isPending ? "Buscando…" : "Nada encontrado."}</CommandEmpty>
          {results && results.rooms.length > 0 ? (
            <CommandGroup heading="Salas">
              {results.rooms.map((room) => (
                <CommandItem
                  key={room.id}
                  // O texto digitado no valor: o filtro local do cmdk não esconde o resultado.
                  value={`${term} sala ${room.code}`}
                  onSelect={() =>
                    run(() => {
                      void navigate(`/admin/salas/${room.id}`);
                    })
                  }
                >
                  <Video aria-hidden="true" />
                  <span className="font-sans tabular-nums">{room.code}</span>
                  {room.status === "active" ? (
                    <span className="ml-auto text-xs text-danger">ao vivo</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results && results.people.length > 0 ? (
            <CommandGroup heading="Participantes">
              {results.people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`${term} pessoa ${person.id}`}
                  onSelect={() =>
                    run(() => {
                      void navigate(`/admin/usuarios/${person.id}`);
                    })
                  }
                >
                  <User aria-hidden="true" />
                  <span className="truncate">{person.name}</span>
                  <span className="ml-auto truncate text-xs text-ink-muted">{person.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords.join(" ")}`}
                    onSelect={() =>
                      run(() => {
                        void navigate(item.href);
                      })
                    }
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
