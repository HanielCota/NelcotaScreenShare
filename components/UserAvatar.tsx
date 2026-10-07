import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** The same photo everywhere the account appears; without one, the default person icon. */
export function UserAvatar({ image, className }: { image: string | null; className?: string }) {
  return (
    <Avatar className={className} aria-hidden="true">
      <AvatarImage src={image ?? undefined} alt="" referrerPolicy="no-referrer" />
      <AvatarFallback>
        <UserRound className="size-[55%]" strokeWidth={1.75} aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  );
}
