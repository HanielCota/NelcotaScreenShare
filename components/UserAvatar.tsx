import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";

/** A mesma foto e alternativa em todos os pontos da conta. */
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
