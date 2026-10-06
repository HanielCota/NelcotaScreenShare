import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/format";
import { roomPath } from "@/lib/livekit";
import type { RecentRoom } from "@/lib/recent-room";

/** "Suas salas recentes": volta para uma sala com um clique. */
export function RecentRooms({ rooms }: { rooms: RecentRoom[] }) {
  if (rooms.length === 0) return null;
  return (
    <section aria-labelledby="recent-rooms" className="w-full">
      <h2 id="recent-rooms" className="mb-3 px-1 text-sm font-semibold text-ink-muted">
        Suas salas recentes
      </h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {rooms.map((room) => (
          <li key={room.code} className="shrink-0 snap-start">
            <Link
              href={roomPath(room.code)}
              className="group flex w-52 flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 transition-[transform,border-color] duration-200 hover:border-brand/50 active:scale-[0.98] sm:w-auto"
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
