import { Outlet } from "react-router";
import { BrandPanel } from "@/features/auth/ui/BrandPanel";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";

/**
 * Participant account access screens: a panel in the center of the page,
 * with the mascot on one side (a strip at the top, on mobile) and the form on
 * the other. Inside the panel the AuthCard does not draw its own card
 * (`data-layout="split"`).
 */
export default function AccessLayout() {
  const children = <Outlet />;
  return (
    <div className="apple-buttons flex min-h-dvh flex-col">
      <ParticipantHeader showAuthLinks={false} />
      <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-8 sm:px-6 lg:justify-center lg:py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface lg:min-h-[34rem] lg:grid-cols-[5fr_6fr]">
          <BrandPanel />
          <div
            data-layout="split"
            className="group/access flex flex-col items-center justify-center px-5 py-7 sm:px-10 sm:py-10"
          >
            {children}
            {/* On mobile the notice comes after the form (on desktop, on the mascot side). */}
            <ShareSupportNote className="mt-8 w-full max-w-sm border-t border-line pt-5 lg:hidden" />
          </div>
        </div>
      </main>
    </div>
  );
}
