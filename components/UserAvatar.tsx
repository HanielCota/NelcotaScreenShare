import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";

/** The same photo and fallback everywhere the account appears. */
export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className} aria-hidden="true">
      <AvatarImage src={image ?? undefined} alt="" referrerPolicy="no-referrer" />
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
