import type { BadgeTone } from "@/components/admin/StatusBadge";
import type { ParticipantStatus } from "./search-params";

export const STATUS_LABELS: Record<ParticipantStatus, { label: string; tone: BadgeTone }> = {
  ativo: { label: "Ativo", tone: "success" },
  nao_verificado: { label: "Não verificado", tone: "warning" },
  bloqueado: { label: "Bloqueado", tone: "danger" },
  excluido: { label: "Excluído", tone: "neutral" },
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as ParticipantStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value].label,
}));

export const SORT_OPTIONS = [
  { value: "cadastro", label: "Cadastro" },
  { value: "acesso", label: "Último acesso" },
  { value: "participacoes", label: "Participações" },
] as const;
