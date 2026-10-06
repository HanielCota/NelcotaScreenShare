import "server-only";
import { createAccessControl } from "better-auth/plugins/access";
import type { AdminRole } from "./roles";

/**
 * Matriz de permissões do painel (docs/PLANO-ADMIN.md §5.2), fonte única.
 *
 * `user` e `session` são os recursos do plugin admin do Better Auth e se
 * referem às CONTAS DE ADMIN desta instância. Participantes (contas do app)
 * são o recurso `participant`.
 *
 * Ficam de fora de todo papel, de propósito: impersonar, apagar admin,
 * definir senha ou e-mail de outro admin.
 */
export const statements = {
  // Plugin admin (contas de admin)
  user: ["create", "list", "set-role", "ban", "get", "update"],
  session: ["list", "revoke", "delete"],
  adminInvitation: ["create", "revoke"],
  // Painel
  dashboard: ["read"],
  participant: ["read", "update", "delete", "export", "anonymize"],
  room: ["read", "update", "delete", "export"],
  shareSession: ["read", "export"],
  live: ["read", "kick", "close"],
  roomInvite: ["create", "revoke"],
  audit: ["read", "export"],
  settings: ["read", "update"],
  lgpd: ["read", "handle"],
  system: ["dbHealth"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  owner: ac.newRole({
    user: ["create", "list", "set-role", "ban", "get", "update"],
    session: ["list", "revoke", "delete"],
    adminInvitation: ["create", "revoke"],
    dashboard: ["read"],
    participant: ["read", "update", "delete", "export", "anonymize"],
    room: ["read", "update", "delete", "export"],
    shareSession: ["read", "export"],
    live: ["read", "kick", "close"],
    roomInvite: ["create", "revoke"],
    audit: ["read", "export"],
    settings: ["read", "update"],
    lgpd: ["read", "handle"],
    system: ["dbHealth"],
  }),
  admin: ac.newRole({
    user: ["list", "get"],
    dashboard: ["read"],
    participant: ["read", "update", "delete", "export"],
    room: ["read", "update", "delete", "export"],
    shareSession: ["read", "export"],
    live: ["read", "kick", "close"],
    roomInvite: ["create", "revoke"],
    audit: ["read"],
    settings: ["read"],
    lgpd: ["read"],
  }),
  viewer: ac.newRole({
    dashboard: ["read"],
    participant: ["read"],
    room: ["read"],
    shareSession: ["read"],
    live: ["read"],
  }),
} satisfies Record<AdminRole, unknown>;

type Resource = keyof typeof statements;
type Action<R extends Resource> = (typeof statements)[R][number];
/** Pedido de permissão: `{ room: ["close"] }`. */
export type PermissionRequest = { [R in Resource]?: readonly Action<R>[] };

/** O papel tem TODAS as permissões pedidas? */
export function can(role: AdminRole, request: PermissionRequest): boolean {
  // O tipo do Better Auth pede arrays mutáveis; a cópia não muda o conteúdo.
  const copy = Object.fromEntries(
    Object.entries(request).map(([resource, actions]) => [resource, [...(actions ?? [])]]),
  );
  return roles[role].authorize(copy).success;
}
