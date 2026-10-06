import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/format";
import { roomPath } from "@/features/room/domain/room-code";
import type { RecentRoom } from "@/features/room/domain/recent-room";

/** "Suas salas recentes": volta para uma sala com um clique. */
export function RecentRooms({ rooms }: { rooms: RecentRoom[] }) {
  if (rooms.length === 0) return null;
  return (
    <section aria-labelledby="recent-rooms" className="w-full">
      <h2 id="recent-rooms" className="mb-3 text-center text-sm font-semibold text-ink-muted">
        Suas salas recentes
      </h2>
      {/* Centralizado como o resto da página; no celular, duas por linha (nada corta). */}
      <ul className="flex flex-wrap justify-center gap-3">
        {rooms.map((room) => (
          <li key={room.code} className="w-[calc(50%-0.375rem)] sm:w-52">
            <Link
              href={roomPath(room.code)}
              className="group flex h-full flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 transition-[transform,border-color] duration-200 hover:border-brand/50 active:scale-[0.98]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm font-semibold">{room.code}</span>
                <ArrowUpRight
                  className="size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-ink"
                  aria-hidden="true"
                />
              </span>
              {room.live ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                  Ao vivo · {room.online === 1 ? "1 pessoa" : `${room.online} pessoas`}
                </span>
              ) : (
                <time
                  dateTime={room.lastJoinedAt}
                  suppressHydrationWarning
                  className="text-xs text-ink-subtle"
                >
                  Você entrou {formatRelative(room.lastJoinedAt)}
                </time>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
