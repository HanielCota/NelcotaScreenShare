import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Hint({
  text,
  children,
  container,
}: {
  text?: string;
  children: ReactElement;
  container?: Element | null;
}) {
  if (!text) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={8} container={container}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
