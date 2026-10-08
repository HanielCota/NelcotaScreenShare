import { Outlet } from "react-router";
import { AccessShell } from "@/features/auth/ui/AccessShell";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";
import { ThemeChoice } from "@/components/shell/ThemeChoice";

/** Participant account access screens, with the theme choice below the form. */
export default function AccessLayout() {
  return (
    <AccessShell header={<ParticipantHeader showAuthLinks={false} />}>
      <Outlet />
      <ThemeChoice className="mt-8 w-full max-w-sm" />
      {/* On mobile the notice comes after the form (on desktop, on the mascot side). */}
      <ShareSupportNote className="mt-8 w-full max-w-sm border-t border-line pt-5 lg:hidden" />
    </AccessShell>
  );
}
