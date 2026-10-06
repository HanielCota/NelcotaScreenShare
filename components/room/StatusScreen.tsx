"use client";

import type { LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface StatusScreenProps {
  icon: LucideIcon;
  tone?: "brand" | "danger";
  title: string;
  message?: string;
  alert?: boolean;
  children: ReactNode;
}

/** Card centralizado das telas de saída e de falha de conexão. */
export function StatusScreen({
  icon: Icon,
  tone = "brand",
  title,
  message,
  alert,
  children,
}: StatusScreenProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from(scope.current, { y: 20, opacity: 0, scale: 0.97, duration: 0.7 });
      });
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      role={alert ? "alert" : undefined}
      className="glass w-full max-w-md rounded-2xl p-8 text-center"
    >
      <div
        className={cn(
          "mx-auto mb-5 grid size-12 place-items-center rounded-2xl",
          tone === "danger" ? "bg-danger/15" : "bg-surface-2",
        )}
      >
        <Icon
          className={cn("size-5", tone === "danger" ? "text-danger" : "text-brand-soft")}
          aria-hidden="true"
        />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {message ? <p className="mt-2 text-ink-muted">{message}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:flex-1">{children}</div>
    </div>
  );
}
