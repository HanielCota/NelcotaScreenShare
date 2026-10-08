import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

/**
 * The way back from a page: an arrow and where it leads, in the brand tone, with the arrow
 * stepping back on hover. Defaults to the home page.
 */
export function BackLink({
  to = "/",
  children = "Voltar ao início",
  className,
}: {
  to?: string;
  children?: string;
  className?: string;
}) {
  return (
    <Link
      viewTransition
      to={to}
      className={cn(
        "inline-flex w-fit items-center gap-2 text-sm font-medium text-brand-soft underline-offset-4 hover:underline",
        className,
      )}
    >
      <ArrowLeft className="icon-back size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
