import {
  Gauge,
  History,
  KeyRound,
  MonitorPlay,
  MonitorSmartphone,
  MonitorUp,
  Settings2,
  ShieldUser,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon } from "@/features/admin/shell/nav.server";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: Gauge,
  live: MonitorPlay,
  rooms: Video,
  users: Users,
  shares: MonitorUp,
  audit: History,
  admins: ShieldUser,
  settings: Settings2,
  security: KeyRound,
  sessions: MonitorSmartphone,
};
