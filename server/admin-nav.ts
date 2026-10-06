import "server-only";
import { can, type PermissionRequest } from "@/server/auth/permissions";
import type { AdminRole } from "@/server/auth/roles";

/**
 * Navegação do painel. Cada fase acrescenta as telas que ficam prontas; o
 * servidor filtra pelo papel e manda ao cliente só o que a pessoa pode abrir.
 */
export type NavIcon =
  | "home"
  | "live"
  | "rooms"
  | "users"
  | "shares"
  | "audit"
  | "admins"
  | "settings"
  | "security"
  | "sessions";

interface NavItemDefinition {
  href: string;
  label: string;
  icon: NavIcon;
  permission?: PermissionRequest;
  /** Palavras extras para a busca do command palette. */
  keywords?: string[];
}

const NAV: { label: string; items: NavItemDefinition[] }[] = [
  {
    label: "Visão geral",
    items: [{ href: "/admin", label: "Início", icon: "home", permission: { dashboard: ["read"] } }],
  },
  {
    label: "Uso",
    items: [
      {
        href: "/admin/salas",
        label: "Salas",
        icon: "rooms",
        permission: { room: ["read"] },
        keywords: ["sala", "código", "convite"],
      },
      {
        href: "/admin/usuarios",
        label: "Participantes",
        icon: "users",
        permission: { participant: ["read"] },
        keywords: ["usuário", "conta", "pessoa", "bloquear"],
      },
      {
        href: "/admin/compartilhamentos",
        label: "Compartilhamentos",
        icon: "shares",
        permission: { shareSession: ["read"] },
        keywords: ["tela", "share"],
      },
    ],
  },
  {
    label: "Governança",
    items: [
      {
        href: "/admin/auditoria",
        label: "Auditoria",
        icon: "audit",
        permission: { audit: ["read"] },
        keywords: ["log", "histórico", "quem fez"],
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        href: "/admin/configuracoes",
        label: "Configurações",
        icon: "settings",
        permission: { settings: ["read"] },
        keywords: ["mascote", "saturação"],
      },
    ],
  },
  {
    label: "Minha conta",
    items: [
      {
        href: "/admin/conta/seguranca",
        label: "Segurança",
        icon: "security",
        keywords: ["2fa", "senha"],
      },
      { href: "/admin/conta/sessoes", label: "Sessões ativas", icon: "sessions" },
    ],
  },
];

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  keywords: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function navFor(role: AdminRole): NavGroup[] {
  return NAV.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => !item.permission || can(role, item.permission))
      .map(({ href, label, icon, keywords }) => ({ href, label, icon, keywords: keywords ?? [] })),
  })).filter((group) => group.items.length > 0);
}
